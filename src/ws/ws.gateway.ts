// src/ws/ws.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { ReservationLockStore } from './reservation-lock.store';
import { UseGuards } from '@nestjs/common';
import { CreateReservationsDto } from '../reservations/dto/create-reservations.dto';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    sub: number;
    email: string;
    role: string;
    name?: string;
  };
}

@WebSocketGateway({
  cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  // Client emits this right after connecting (JWT payload only has sub/email,
  // no role, so we resolve the real user + role from the DB) to join its
  // personal room for targeted delivery (notifications, chat) instead of the
  // global broadcasts used elsewhere in this gateway.
  @SubscribeMessage('register')
  async handleRegister(@ConnectedSocket() client: AuthenticatedSocket) {
    const sub = client.user?.sub;
    if (!sub) return;

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, role: true },
    });
    if (!user) return;

    client.join(`user:${user.id}`);
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      client.join('role:staff');
    }
  }

  handleConnection(client: AuthenticatedSocket) {
    console.log(
      `WS CONNECTED: user=${client.user?.sub} email=${client.user?.email}`
    );
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(
      `WS DISCONNECTED: user=${client.user?.sub} email=${client.user?.email}`
    );
  }

  @SubscribeMessage('reservation:join')
  handleJoin(
    @MessageBody() data: { reservationId: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { reservationId } = data;

    const user = client.user!;
    const userId = user.sub;
    const success = ReservationLockStore.join(reservationId, userId);
    if (!success) {
      client.emit('reservation:joinDenied', {
        reservationId,
        reason: 'Rezervarea este ocupata de alt utilizator',
      });
      return;
    }

    this.server.emit('reservation:joined', {
      reservationId,
      userId,
    });
  }

  @SubscribeMessage('reservation:leave')
  handleLeave(
    @MessageBody() data: { reservationId: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { reservationId } = data;

    const user = client.user!;
    const userId = user.sub;

    ReservationLockStore.leave(reservationId, userId);

    this.server.emit('reservation:left', {
      reservationId,
      userId,
    });
  }

  @SubscribeMessage('reservation:create:started')
  handleReservationCreationStarted(
    @MessageBody() reservationDraft: CreateReservationsDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const user = client.user;
    if (!user) {
      return;
    }

    this.server.emit('reservation:create:started', {
      reservationDraft,
      startedBy: {
        id: user.sub,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  }
}

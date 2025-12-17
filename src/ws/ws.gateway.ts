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

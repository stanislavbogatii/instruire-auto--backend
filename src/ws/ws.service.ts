// src/ws/ws.service.ts
import { Injectable } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { Reservation, User } from '@prisma/client';

@Injectable()
export class WsService {
  constructor(private readonly gateway: WsGateway) {}

  emitReservationsCreated(reservations: Reservation[], user: User) {
    this.gateway.server.emit('reservation:create', {
      reservations,
      performedBy: this.mapUser(user),
    });
  }

  emitReservationUpdated(reservations: Reservation[], user: User) {
    this.gateway.server.emit('reservation:update', {
      reservations,
      performedBy: this.mapUser(user),
    });
  }

  emitReservationDeleted(id: number, user: User) {
    this.gateway.server.emit('reservation:delete', {
      id,
      performedBy: this.mapUser(user),
    });
  }

  emitNotification(userId: number, notification: unknown) {
    this.gateway.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitChatMessageToStudent(studentId: number, message: unknown) {
    this.gateway.server.to(`user:${studentId}`).emit('chat:message', message);
  }

  emitChatMessageToStaff(message: unknown) {
    this.gateway.server.to('role:staff').emit('chat:message', message);
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      lastName: user.firstName,
      email: user.email,
      role: user.role,
    };
  }
}

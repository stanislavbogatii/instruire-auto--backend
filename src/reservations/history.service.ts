import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ReservationHistoryDto } from './dto/reservation-history.dto';

enum HistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CONFIRM = 'CONFIRM',
  UNCONFIRM = 'UNCONFIRM'
}

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async createHistoryRecord(
    reservationId: number,
    action: HistoryAction,
    currentData: any,
    changedBy?: number,
    oldData?: any
  ) {
    const changedFields = this.calculateChangedFields(oldData, currentData);

    return this.prisma.reservationHistory.create({
      data: {
        reservationId,
        userId: currentData.userId,
        instructorId: currentData.instructorId,
        carId: currentData.carId,
        instructorsGroupId: currentData.instructorsGroupId,
        startTime: currentData.startTime,
        sector: currentData.sector || '',
        gearbox: currentData.gearbox || '',
        privateMessage: currentData.privateMessage || '',
        color: currentData.color || '',
        isConfirmed: currentData.isConfirmed || false,
        action,
        changedBy,
        changedFields: changedFields ? (changedFields as Prisma.InputJsonValue) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        changedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async getReservationHistory(reservationId: number): Promise<ReservationHistoryDto[]> {
    return await this.prisma.reservationHistory.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        car: {
          select: {
            id: true,
            plateNumber: true,
          }
        },
        instructorsGroup: {
          select: {
            id: true,
            name: true,
          }
        },
        changedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async getUserReservationHistory(userId: number): Promise<ReservationHistoryDto[]> {
    return await this.prisma.reservationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        car: {
          select: {
            id: true,
            plateNumber: true,
          }
        },
        instructorsGroup: {
          select: {
            id: true,
            name: true,
          }
        },
        changedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async getInstructorReservationHistory(instructorId: number): Promise<ReservationHistoryDto[]> {
    return await this.prisma.reservationHistory.findMany({
      where: { instructorId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        car: {
          select: {
            id: true,
            plateNumber: true,
          }
        },
        instructorsGroup: {
          select: {
            id: true,
            name: true,
          }
        },
        changedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  private calculateChangedFields(oldData: any, newData: any): any {
    if (!oldData) {
      return { action: 'created', newData };
    }

    const changes: any = {};
    const fieldsToTrack = [
      'userId',
      'instructorId',
      'carId',
      'instructorsGroupId',
      'startTime',
      'sector',
      'gearbox',
      'privateMessage',
      'color',
      'isConfirmed',
      'isCancelled',
      'isFavorite',
      'isImportant',
    ];

    fieldsToTrack.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes[field] = {
          from: oldData[field],
          to: newData[field]
        };
      }
    });

    // Special handling for DateTime fields
    if (oldData.startTime && newData.startTime) {
      const oldTime = new Date(oldData.startTime).getTime();
      const newTime = new Date(newData.startTime).getTime();
      if (oldTime !== newTime) {
        changes.startTime = {
          from: oldData.startTime,
          to: newData.startTime
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}

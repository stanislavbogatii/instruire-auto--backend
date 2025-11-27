import { Expose, Type } from 'class-transformer';

export class ReservationDto {
  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'USER'] })
  id: number;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'USER'] })
  startTime: Date;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  sector: string;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  gearbox: string;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  privateMessage: string;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  color: string;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  isConfirmed: boolean;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  isCancelled: boolean;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  userId: number;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  instructorId: number;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  carId?: number;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  instructorsGroupId?: number;

  @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
  createdAt?: number;
}

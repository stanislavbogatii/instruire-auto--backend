import { Prisma } from '@prisma/client';

export type ReservationHistoryDto = Prisma.ReservationHistoryGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
    instructor: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
    car: {
      select: {
        id: true;
        plateNumber: true;
      };
    };
    instructorsGroup: {
      select: {
        id: true;
        name: true;
      };
    };
    changedByUser: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

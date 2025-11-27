export class ReservationLockStore {
  static locks = new Map<number, number>();

  static join(reservationId: number, userId: number): boolean {
    const lockedBy = this.locks.get(reservationId);

    if (lockedBy && lockedBy !== userId) {
      return false;
    }

    this.locks.set(reservationId, userId);
    return true;
  }

  static leave(reservationId: number, userId: number): void {
    const lockedBy = this.locks.get(reservationId);

    if (lockedBy === userId) {
      this.locks.delete(reservationId);
    }
  }

  static isLocked(reservationId: number) {
    return this.locks.get(reservationId);
  }
}

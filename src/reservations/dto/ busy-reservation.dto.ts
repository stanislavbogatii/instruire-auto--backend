export interface InstructorResponse {
  instructorId: number;
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

export interface GroupResponse {
  groupId: number | null;
  instructorsIds: number[];
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

export type BusyReservationGrupResponse = GroupResponse;
export type BusyReservationInstructorResponse = InstructorResponse;

export type BusyReservationResponse = GroupResponse;
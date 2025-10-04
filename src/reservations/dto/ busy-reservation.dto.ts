export interface InstructorResponse {
  instructorId: number;
  total_instructors?: number;
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

export interface GroupResponse {
  groupId: number;
  total_instructors?: number;
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

export type BusyReservationGrupResponse = GroupResponse;
export type BusyReservationInstructorResponse = InstructorResponse;

export type BusyReservationResponse = InstructorResponse | GroupResponse;
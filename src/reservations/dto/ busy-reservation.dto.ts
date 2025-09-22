// Ответ для обычного инструктора
export interface InstructorResponse {
  instructorId: number;
  total_instructors: number;
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

// Ответ для группы
export interface GroupResponse {
  groupId: number;
  total_instructors: number;
  reservations: {
    id: number;
    startTime: Date;
  }[];
}

export type BusyReservationGrupResponse = GroupResponse;
export type BusyReservationInstructorResponse = InstructorResponse;

// Union type для обоих случаев
export type BusyReservationResponse = InstructorResponse | GroupResponse;
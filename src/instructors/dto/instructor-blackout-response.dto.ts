import { Expose } from "class-transformer";

export class InstructorBlackoutResponseDto {
    @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'USER'] })
    id: number;
    
    @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'USER'] })
    dateTime: Date;

    @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'USER'] })
    instructorId: number;

    @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
    createdAt: Date;

    @Expose({ groups: ['ADMIN', 'MANAGER', 'INSTRUCTOR'] })
    updatedAt: Date;
}
        
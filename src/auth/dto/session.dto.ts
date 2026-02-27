import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class InstructorProfileDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  sector: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  @Expose()
  instructorsGroupId: number | null;
}

export class SessionDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  idnp: number;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  medical_documents: boolean;
  
  @ApiProperty()
  @Expose()
  individual_work: boolean;

  @ApiProperty()
  @Expose()
  number_of_absences: number;

  @ApiProperty()
  @Expose()
  groupId: number;

  @ApiProperty()
  @Expose()
  role: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty({ type: InstructorProfileDto, nullable: true })
  @Expose()
  @Type(() => InstructorProfileDto)
  instructorProfile: InstructorProfileDto | null;
}

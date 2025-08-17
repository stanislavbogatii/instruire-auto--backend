import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommonService } from '../common/common.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@Injectable()
export class CarsService {
  constructor(
    private prisma: PrismaService,
    private commonService: CommonService
  ) {}

  async create(createCarDto: CreateCarDto) {
    try {
      const { instructorId, plateNumber } = createCarDto;
      console.log('Creating car with data:', { plateNumber, instructorId });

      // If instructorId is provided, verify that the instructor exists and is active
      if (instructorId) {
        await this.commonService.validateActiveInstructor(instructorId);
      }

      // Create the car with required plateNumber
      const carData = {
        plateNumber: createCarDto.plateNumber,
        ...(instructorId ? { instructorId } : {})
      };

      console.log('Creating car with data:', carData);

      const car = await this.prisma.car.create({
        data: carData,
        include: {
          instructor: true,
        },
      });
      
      console.log('Car created successfully:', car);
      return car;
    } catch (error) {
      console.error('Error creating car:', error);
      throw error;
    }
  }

  findAll() {
    return this.prisma.car.findMany({
      include: {
        instructor: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.car.findUnique({
      where: { id },
      include: {
        instructor: true,
      },
    });
  }

  update(id: number, updateCarDto: UpdateCarDto) {
    return this.prisma.car.update({
      where: { id },
      data: updateCarDto,
    });
  }

  remove(id: number) {
    return this.prisma.car.delete({
      where: { id },
    });
  }
}

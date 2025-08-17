import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarResponseDto } from './dto/car-response.dto';

@ApiTags('cars')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new car' })
  @ApiResponse({ 
    status: 201, 
    description: 'The car has been successfully created.',
    type: CarResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid car data provided.' })
  @ApiResponse({ status: 404, description: 'Instructor not found.' })
  async create(@Body() createCarDto: CreateCarDto) {
    try {
      console.log('Received create car request with data:', createCarDto);
      const result = await this.carsService.create(createCarDto);
      console.log('Car created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error in create car controller:', error);
      
      if (error.message?.includes('Instructor')) {
        throw new NotFoundException(error.message);
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('A car with this plate number already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid instructor ID provided');
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create car');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all cars' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns an array of cars',
    type: [CarResponseDto]
  })
  findAll() {
    return this.carsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a car by id' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the car',
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the car with the specified ID',
    type: CreateCarDto
  })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a car' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the car to update',
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'The car has been successfully updated.',
    type: CreateCarDto
  })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  update(@Param('id') id: string, @Body() updateCarDto: UpdateCarDto) {
    return this.carsService.update(+id, updateCarDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a car' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the car to delete',
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'The car has been successfully deleted.'
  })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  remove(@Param('id') id: string) {
    return this.carsService.remove(+id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { QuestionCategoriesService } from './question-categories.service';
import { CreateQuestionCategoryDto, UpdateQuestionCategoryDto } from './dto/question-category.dto';

@ApiTags('question-categories')
@Controller('question-categories')
export class QuestionCategoriesController {
  constructor(private readonly categoriesService: QuestionCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question category' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createCategoryDto: CreateQuestionCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all question categories with pagination' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    return this.categoriesService.findAll(page, limit);
  }

  @Get('with-count')
  @ApiOperation({ summary: 'Get all categories with question count' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getCategoriesWithCount() {
    return this.categoriesService.getCategoriesWithQuestionCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateQuestionCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionCategoryDto, UpdateQuestionCategoryDto } from './dto/question-category.dto';

@Injectable()
export class QuestionCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateQuestionCategoryDto) {
    return this.prisma.questionCategory.create({
      data: createCategoryDto,
    });
  }

  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      this.prisma.questionCategory.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      }),
      this.prisma.questionCategory.count(),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.questionCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateQuestionCategoryDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.questionCategory.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    // Check if category has questions
    const questionCount = await this.prisma.question.count({
      where: { categoryId: id },
    });

    if (questionCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${questionCount} associated questions. Please reassign or delete the questions first.`,
      );
    }

    await this.prisma.questionCategory.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  async getCategoriesWithQuestionCount() {
    return this.prisma.questionCategory.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { nameRo: 'asc' },
    });
  }
}

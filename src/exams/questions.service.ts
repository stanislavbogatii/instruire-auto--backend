import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(createQuestionDto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        text: createQuestionDto.text,
        image: createQuestionDto.image,
        answers: JSON.stringify(createQuestionDto.answers),
        correctAnswer: createQuestionDto.correctAnswer,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count(),
    ]);

    return {
      data: questions.map(q => ({
        ...q,
        answers: JSON.parse(q.answers),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return {
      ...question,
      answers: JSON.parse(question.answers),
    };
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    const question = await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: {
        text: updateQuestionDto.text,
        image: updateQuestionDto.image,
        answers: updateQuestionDto.answers ? JSON.stringify(updateQuestionDto.answers) : undefined,
        correctAnswer: updateQuestionDto.correctAnswer,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.question.delete({
      where: { id },
    });
  }

  async findRandomQuestions(excludeIds: number[] = [], count: number = 26) {
    const questions = await this.prisma.question.findMany({
      where: {
        id: {
          notIn: excludeIds,
        },
      },
    });

    // Shuffle and take random questions
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

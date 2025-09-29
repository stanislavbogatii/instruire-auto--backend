import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto) {
    const { questionIds, ...ticketData } = createTicketDto;

    // Verify all questions exist
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });

    if (existingQuestions.length !== questionIds.length) {
      throw new BadRequestException('Some questions do not exist');
    }

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: ticketData,
      });

      await tx.ticketQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          ticketId: ticket.id,
          questionId,
          order: index + 1,
        })),
      });

      return this.findOne(ticket.id);
    });
  }

  async findAll(page: number = 1, limit: number = 20, type?: 'EXAM' | 'PRACTICE') {
    const skip = (page - 1) * limit;
    
    // Build where clause - if type is provided, filter by it, otherwise default to EXAM
    const whereClause = {
      type: type || 'EXAM'
    };
    
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          questions: {
            include: { question: true },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { questions: true },
          },
        },
      }),
      this.prisma.ticket.count({
        where: whereClause
      }),
    ]);

    return {
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { 
        id
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return {
      ...ticket,
      questions: ticket.questions.map(tq => ({
        ...tq.question,
        answers: JSON.parse(tq.question.answers),
        order: tq.order,
      })),
    };
  }

  async findTicketQuestions(id: number) {
    const ticket = await this.findOne(id);
    return ticket.questions;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto) {
    await this.findOne(id);

    if (updateTicketDto.questionIds) {
      // Verify all questions exist
      const existingQuestions = await this.prisma.question.findMany({
        where: { id: { in: updateTicketDto.questionIds } },
        select: { id: true },
      });

      if (existingQuestions.length !== updateTicketDto.questionIds.length) {
        throw new BadRequestException('Some questions do not exist');
      }

      return this.prisma.$transaction(async (tx) => {
        // Update ticket basic info
        const ticket = await tx.ticket.update({
          where: { id },
          data: {
            name: updateTicketDto.name,
          },
        });

        // Remove existing question relationships
        await tx.ticketQuestion.deleteMany({
          where: { ticketId: id },
        });

        // Create new question relationships
        await tx.ticketQuestion.createMany({
          data: updateTicketDto.questionIds!.map((questionId, index) => ({
            ticketId: id,
            questionId,
            order: index + 1,
          })),
        });

        return this.findOne(id);
      });
    }

    // Only update basic info
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        name: updateTicketDto.name,
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.ticket.delete({
      where: { id },
    });
  }

  async getRandomTickets(count: number = 2, excludeTicketIds: number[] = [], type: 'EXAM' | 'PRACTICE' = 'EXAM') {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        id: {
          notIn: excludeTicketIds,
        },
        type: type, // Filter by ticket type
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Shuffle and take random tickets
    const shuffled = tickets.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

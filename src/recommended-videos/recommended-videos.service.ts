import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendedVideoDto } from './dto/create-recommended-video.dto';
import { UpdateRecommendedVideoDto } from './dto/update-recommended-video.dto';
import { SendLessonVideoDto } from './dto/send-lesson-video.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class RecommendedVideosService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateRecommendedVideoDto) {
    return this.prisma.recommendedVideo.create({ data: dto });
  }

  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      this.prisma.recommendedVideo.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: { _count: { select: { sends: true } } },
      }),
      this.prisma.recommendedVideo.count(),
    ]);

    return {
      data: videos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const video = await this.prisma.recommendedVideo.findUnique({
      where: { id },
      include: { _count: { select: { sends: true } } },
    });

    if (!video) {
      throw new NotFoundException(`Videoclipul cu id=${id} nu a fost găsit`);
    }

    return video;
  }

  async update(id: number, dto: UpdateRecommendedVideoDto) {
    await this.findOne(id);

    return this.prisma.recommendedVideo.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const sendCount = await this.prisma.lessonVideoSend.count({ where: { videoId: id } });
    if (sendCount > 0) {
      throw new BadRequestException(
        `Nu poți șterge acest videoclip: a fost deja trimis la ${sendCount} lecții.`,
      );
    }

    await this.prisma.recommendedVideo.delete({ where: { id } });

    return { message: 'Videoclip șters cu succes' };
  }

  private async resolveInstructor(userId: number) {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('Nu ești înregistrat ca instructor');
    }
    return instructor;
  }

  // Past, non-cancelled lessons for this instructor with no video sent yet.
  async getPendingSends(instructorUserId: number) {
    const instructor = await this.resolveInstructor(instructorUserId);
    const now = new Date();

    return this.prisma.reservation.findMany({
      where: {
        instructorId: instructor.id,
        deletedAt: null,
        isCancelled: false,
        startTime: { lt: now },
        videoSend: null,
      },
      select: {
        id: true,
        startTime: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async sendVideo(instructorUserId: number, dto: SendLessonVideoDto) {
    const { reservationId, videoId } = dto;
    const instructor = await this.resolveInstructor(instructorUserId);

    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, instructorId: instructor.id, deletedAt: null },
    });
    if (!reservation) {
      throw new NotFoundException(`Rezervarea cu id=${reservationId} nu a fost găsită`);
    }
    if (reservation.isCancelled) {
      throw new BadRequestException('Nu poți trimite un videoclip pentru o lecție anulată');
    }
    if (new Date(reservation.startTime) > new Date()) {
      throw new BadRequestException(
        'Nu poți trimite un videoclip pentru o lecție care nu a avut loc încă',
      );
    }

    const video = await this.prisma.recommendedVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException(`Videoclipul cu id=${videoId} nu a fost găsit`);
    }

    const existing = await this.prisma.lessonVideoSend.findUnique({ where: { reservationId } });
    if (existing) {
      throw new ConflictException('Un videoclip a fost deja trimis pentru această lecție');
    }

    const send = await this.prisma.lessonVideoSend.create({
      data: {
        reservationId,
        userId: reservation.userId,
        instructorId: instructor.id,
        videoId,
      },
      include: {
        video: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.notificationsService.create(
      reservation.userId,
      NotificationType.LESSON_VIDEO,
      'Videoclip recomandat',
      `Instructorul tău ți-a recomandat un videoclip: ${video.title}`,
      { reservationId, videoId, youtubeUrl: video.youtubeUrl },
    );

    return send;
  }
}

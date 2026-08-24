import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WsService } from '../ws/ws.service';
import { ChatMessage, Role, User } from '@prisma/client';

type ChatMessageWithSender = ChatMessage & {
  sender: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
};

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private wsService: WsService,
  ) {}

  // ─── Student (self) ────────────────────────────────────────────────────

  async getOrCreateConversationForStudent(studentId: number) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, groupId: true },
    });

    if (!student || student.groupId === null) {
      throw new ForbiddenException('Chat-ul este disponibil doar pentru studenții atașați unei grupe.');
    }

    const conversation = await this.prisma.chatConversation.upsert({
      where: { studentId },
      create: { studentId },
      update: {},
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => this.toStudentView(m)),
    };
  }

  async postStudentMessage(studentId: number, body: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, groupId: true },
    });

    if (!student || student.groupId === null) {
      throw new ForbiddenException('Chat-ul este disponibil doar pentru studenții atașați unei grupe.');
    }

    const conversation = await this.prisma.chatConversation.upsert({
      where: { studentId },
      create: { studentId },
      update: {},
    });

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: { conversationId: conversation.id, senderId: studentId, senderRole: Role.USER, body },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      });
      await tx.chatConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      return created;
    });

    this.wsService.emitChatMessageToStudent(studentId, this.toStudentView(message));
    this.wsService.emitChatMessageToStaff(this.toStaffView(message));

    return this.toStudentView(message);
  }

  // ─── Staff (ADMIN/MANAGER) ─────────────────────────────────────────────

  async listConversationsForStaff(actor: User) {
    const baseWhere =
      actor.role === Role.ADMIN
        ? {}
        : actor.role === Role.MANAGER
          ? {
              student: {
                groupId: { not: null },
                group: {
                  managerAssignments: { some: { managerId: actor.id } },
                },
              },
            }
          : { studentId: actor.id };

    const conversations = await this.prisma.chatConversation.findMany({
      where: baseWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            groupId: true,
            group: { select: { id: true, name: true, sector: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      student: {
        ...c.student,
        group: c.student.group ?? null,
      },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastMessage: c.messages[0] ? this.toStaffView(c.messages[0]) : null,
    }));
  }

  async getConversationForStaff(id: number, actor: User) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            groupId: true,
            group: { select: { id: true, name: true, sector: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversația cu id=${id} nu a fost găsită`);
    }

    if (actor.role === Role.MANAGER) {
      const hasAccess = conversation.student.groupId !== null &&
        await this.prisma.managerGroup.findFirst({
          where: { managerId: actor.id, groupId: conversation.student.groupId },
          select: { id: true },
        });

      if (!hasAccess) {
        throw new ForbiddenException('Nu aveți acces la această conversație.');
      }
    }

    return {
      id: conversation.id,
      student: {
        ...conversation.student,
        group: conversation.student.group ?? null,
      },
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => this.toStaffView(m)),
    };
  }

  async postStaffMessage(conversationId: number, staffUser: User, body: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        student: {
          select: { id: true, groupId: true },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversația cu id=${conversationId} nu a fost găsită`);
    }

    if (staffUser.role === Role.MANAGER) {
      const hasAccess = conversation.student.groupId !== null &&
        await this.prisma.managerGroup.findFirst({
          where: { managerId: staffUser.id, groupId: conversation.student.groupId },
          select: { id: true },
        });

      if (!hasAccess) {
        throw new ForbiddenException('Nu aveți acces să răspundeți la această conversație.');
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: staffUser.id,
          senderRole: staffUser.role,
          body,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      });
      await tx.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });

    this.wsService.emitChatMessageToStudent(conversation.studentId, this.toStudentView(message));
    this.wsService.emitChatMessageToStaff(this.toStaffView(message));

    return this.toStaffView(message);
  }

  // ─── View mapping ──────────────────────────────────────────────────────
  // Student-facing: sender identity is never exposed, only a generic role
  // label ("STUDENT" own messages, "MANAGER" for any ADMIN/MANAGER reply -
  // never distinguishing which specific manager, or ADMIN vs MANAGER).

  private toStudentView(message: ChatMessage) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      body: message.body,
      createdAt: message.createdAt,
      senderRole: message.senderRole === Role.USER ? 'STUDENT' : 'MANAGER',
    };
  }

  // Staff-facing: full identity, with a graceful fallback if the sender
  // account was later deleted (senderId is SetNull, not cascaded - see
  // schema.prisma ChatMessage.sender) so this never errors on a null sender.

  private toStaffView(message: ChatMessageWithSender) {
    const deletedLabel = message.senderRole === Role.USER ? 'Student șters' : 'Manager șters';
    const genericLabel = message.senderRole === Role.USER ? 'Student' : 'Manager';
    const senderName = message.sender
      ? `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim() || genericLabel
      : deletedLabel;

    return {
      id: message.id,
      conversationId: message.conversationId,
      body: message.body,
      createdAt: message.createdAt,
      senderRole: message.senderRole,
      senderId: message.senderId,
      senderName,
    };
  }
}

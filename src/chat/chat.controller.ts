import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Session } from '../common/session.decorator';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  // ─── Student (self) ────────────────────────────────────────────────────

  @Get('my-conversation')
  @ApiOperation({ summary: 'Conversația proprie cu un manager (student)' })
  getMyConversation(@Session() session: User) {
    return this.service.getOrCreateConversationForStudent(session.id);
  }

  @Post('my-conversation/messages')
  @ApiOperation({ summary: 'Trimite un mesaj în conversația proprie (student)' })
  postMyMessage(@Session() session: User, @Body() dto: CreateChatMessageDto) {
    return this.service.postStudentMessage(session.id, dto.body);
  }

  // ─── Staff (ADMIN/MANAGER) ─────────────────────────────────────────────

  @Get('conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toate conversațiile, cu ultimul mesaj (Admin/Manager)' })
  listConversations() {
    return this.service.listConversationsForStaff();
  }

  @Get('conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toate mesajele unei conversații, cu identitatea expeditorului (Admin/Manager)' })
  getConversation(@Param('id', ParseIntPipe) id: number) {
    return this.service.getConversationForStaff(id);
  }

  @Post('conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Răspunde într-o conversație (Admin/Manager)' })
  postStaffReply(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.service.postStaffMessage(id, session, dto.body);
  }
}

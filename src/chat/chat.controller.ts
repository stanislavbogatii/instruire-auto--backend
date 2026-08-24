import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiResponse({
    status: 200,
    description:
      'Conversația studentului (creată automat dacă nu exista), cu mesajele sale. Identitatea expeditorului staff nu este expusă (senderRole: STUDENT/MANAGER).',
  })
  getMyConversation(@Session() session: User) {
    return this.service.getOrCreateConversationForStudent(session.id);
  }

  @Post('my-conversation/messages')
  @ApiOperation({ summary: 'Trimite un mesaj în conversația proprie (student)' })
  @ApiResponse({ status: 201, description: 'Mesaj trimis; livrat și prin WebSocket studentului și staff-ului.' })
  @ApiResponse({ status: 400, description: 'Mesaj invalid (lipsă sau peste 2000 de caractere).' })
  postMyMessage(@Session() session: User, @Body() dto: CreateChatMessageDto) {
    return this.service.postStudentMessage(session.id, dto.body);
  }

  // ─── Staff (ADMIN/MANAGER) ─────────────────────────────────────────────

  @Get('conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toate conversațiile, cu ultimul mesaj (Admin/Manager)' })
  @ApiResponse({
    status: 200,
    description: 'Lista conversațiilor (studentul + ultimul mesaj, cu identitatea completă a expeditorului), sortate după ultima activitate.',
  })
  listConversations(@Session() session: User) {
    return this.service.listConversationsForStaff(session);
  }

  @Get('conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toate mesajele unei conversații, cu identitatea expeditorului (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID-ul conversației' })
  @ApiResponse({ status: 200, description: 'Conversația, cu toate mesajele și identitatea completă a fiecărui expeditor.' })
  @ApiResponse({ status: 404, description: 'Conversația nu a fost găsită.' })
  getConversation(@Param('id', ParseIntPipe) id: number, @Session() session: User) {
    return this.service.getConversationForStaff(id, session);
  }

  @Post('conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Răspunde într-o conversație (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID-ul conversației' })
  @ApiResponse({ status: 201, description: 'Mesaj trimis; livrat și prin WebSocket studentului și staff-ului.' })
  @ApiResponse({ status: 400, description: 'Mesaj invalid (lipsă sau peste 2000 de caractere).' })
  @ApiResponse({ status: 404, description: 'Conversația nu a fost găsită.' })
  postStaffReply(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User,
    @Body() dto: CreateChatMessageDto,
  ) {
    return this.service.postStaffMessage(id, session, dto.body);
  }
}

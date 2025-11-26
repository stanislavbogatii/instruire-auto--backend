import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Session } from 'src/common/session.decorator';
import { User } from '@prisma/client';
import { NoteResponseDto } from './dto/note-response.dto';

@ApiTags('notes')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ 
    status: 201, 
    description: 'Note created successfully',
    type: NoteResponseDto 
  })
  create(@Body() dto: CreateNoteDto, @Session() session: User) {
    return this.notesService.create(session.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notes' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all notes',
    type: [NoteResponseDto]
  })
  findAll() {
    return this.notesService.findAll();
  }

  @Get('my-notes')
  @ApiOperation({ summary: 'Get current user notes' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of notes for current user',
    type: [NoteResponseDto]
  })
  findMyNotes(@Session() session: User) {
    return this.notesService.findByUserId(session.id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notes by user ID' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'List of notes for specified user',
    type: [NoteResponseDto]
  })
  findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.notesService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'The note',
    type: NoteResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Note updated successfully',
    type: NoteResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not have permission to update this note' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateNoteDto,
    @Session() session: User,
  ) {
    return this.notesService.update(id, session.id, session.role, updateNoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not have permission to delete this note' })
  remove(@Param('id', ParseIntPipe) id: number, @Session() session: User) {
    return this.notesService.remove(id, session.id, session.role);
  }
}

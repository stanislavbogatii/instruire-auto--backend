import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Log in and receive a JWT' })
  @ApiBody({ type: LoginAuthDto })
  @ApiResponse({ status: 200, description: 'Token returned.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginAuthDto) {
    const token = await this.authService.login(dto);
    if (!token) throw new UnauthorizedException('Invalid credentials');
    return token;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and receive a JWT' })
  @ApiBody({ type: RegisterAuthDto })
  @ApiResponse({ status: 201, description: 'User created and token returned.' })
  async register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }
}

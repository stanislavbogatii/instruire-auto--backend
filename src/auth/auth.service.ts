import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { GroupsService } from 'src/groups/groups.service';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { MailService } from 'src/mail/mail.service';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private groupsService: GroupsService,
    private jwtService: JwtService,
    private mailService: MailService
  ) { }


  async validate(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.hash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  async register(dto: RegisterAuthDto) {
    let groupId: number | undefined;
    if (dto.groupToken) {
      const group = await this.groupsService.findByToken(dto.groupToken);
      groupId = group.id;
    }

    const user = await this.usersService.create(
      { 
        email: dto.email, 
        password: dto.password,
        firstName: dto.firstName,  // Default empty string for now
        lastName: dto.lastName    // Default empty string for now
      },
      groupId,
    );

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }


  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }


  async sendResetPasswordEmail(dto: RequestResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email');

    const payload = { sub: user.id };
    const token = this.jwtService.sign(payload, {
      expiresIn: '15m'
    })
    if (!process.env.CLIENT_URL) {
      throw new InternalServerErrorException("CLIENT_URL not set");
    }
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await this.mailService.sendResetPasswordMail(user.email, resetLink);
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token);
      const user = await this.usersService.findOne(payload.sub);
      if (!user) throw new NotFoundException('User not found');
      await this.usersService.update(user.id, {password: dto.newPassword});
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }
}

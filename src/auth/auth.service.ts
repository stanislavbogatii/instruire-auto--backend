import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}


  async validate(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  async login(dto: any) {
    const payload = { username: dto.username, sub: dto.userId };
    const user: any = null;
    const isMatch: boolean = await this.validate(dto.password, user.password);
    if (isMatch) {
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    return null;
  }

  async register(dto: any) {
    const hashedPassword = await this.hashPassword(dto.password);
  }


  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}

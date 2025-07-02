import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { GroupsService } from 'src/groups/groups.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private groupsService: GroupsService,
    private jwtService: JwtService
  ) {}


  async validate(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  async login(dto: { email: string; password: string }) {
    // 1) Load the user (with hash)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2) Compare password
    const isMatch = await bcrypt.compare(dto.password, user.hash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    // 3) Sign token
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  async register(dto: any) {
    let groupId: number | undefined;
    if (dto.groupToken) {
      const group = await this.groupsService.findByToken(dto.groupToken);
      groupId = group.id;
    }

    // 2) Create the user (UsersService now accepts optional groupId)
    const user = await this.usersService.create(
      { email: dto.email, password: dto.password },
      groupId,
    );

    // 3) Sign & return JWT
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }


  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}

// src/ws/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: any = context.switchToWs().getClient();

    let token: string | null = null;

    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    if (!token) {
      token = client.handshake?.query?.token as string | null;
    }
    
    if (!token) return false;

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.user = payload; 
      return true;
    } catch {
      return false;
    }
  }
}

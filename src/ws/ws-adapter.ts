import { IoAdapter } from '@nestjs/platform-socket.io';
import { JwtService } from '@nestjs/jwt';

export class WsAdapter extends IoAdapter {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  create(port: number, options?: any) {
    const server = super.create(port, options);

    server.use((socket, next) => {
      let token = socket.handshake?.headers?.authorization;

      if (token?.startsWith("Bearer ")) {
        token = token.slice(7);
      }

      if (!token) {
        token = socket.handshake.query.token as string;
      }

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });

        socket.user = payload;
        next();
      } catch (e) {
        next(new Error("Unauthorized"));
      }
    });

    return server;
  }
}

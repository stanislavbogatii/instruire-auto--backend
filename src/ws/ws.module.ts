// src/ws/ws.module.ts
import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { WsService } from './ws.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
     JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
  ],
  providers: [WsGateway, WsService],
  exports: [WsService], 
})
export class WsModule {}

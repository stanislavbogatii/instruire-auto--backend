import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { GroupsModule } from './groups/groups.module';
import { InstructorsModule } from './instructors/instructors.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    InstructorsModule,
    GroupsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    InstructorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

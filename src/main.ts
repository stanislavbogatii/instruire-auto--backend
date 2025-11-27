import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { JwtService } from '@nestjs/jwt';
import { WsAdapter } from './ws/ws-adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://31.97.76.142:3000', 'http://localhost:3000', 'https://instruireauto.site'],
    credentials: true,
  });

  // const jwt = app.get(JwtService);
  // app.useWebSocketAdapter(new WsAdapter(jwt));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api'); // Your API endpoints will be prefixed with /api

  const config = new DocumentBuilder()
    .setTitle('Instruire Auto API')
    .setDescription('API documentation for Users & Authentication')
    .setVersion('1.0')
    .addTag('users')
    .addTag('auth')
    .addBearerAuth( // Add this line
      {
        type: 'http', // Specify the security scheme type as 'http'
        scheme: 'bearer', // Indicate it's a bearer token
        bearerFormat: 'JWT', // Optional: specify the format of the token
        name: 'JWT', // A name for the security scheme (displayed in Swagger UI)
        description: 'Enter JWT token', // A helpful description for users
        in: 'header', // The token will be sent in the request header
      },
      'access-token', // This is the unique key that links to @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // Swagger UI will be at /api-docs

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
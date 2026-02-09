import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // CORS
  app.enableCors({
    origin: nodeEnv === 'production' ? false : '*',
    credentials: true,
  });

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`🚀 Server running on http://0.0.0.0:${port} [${nodeEnv}]`);
  logger.log(`📡 WebSocket server ready on ws://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${err.message}`, err.stack);
  process.exit(1);
});

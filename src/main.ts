import 'reflect-metadata';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

function checkPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '::');
  });
}

async function getNextAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await checkPortFree(port))) {
    port++;
  }
  return port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security hardening: CORS enablement and HTTP header protection
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const desiredPort = Number(process.env.PORT) || 3000;
  const port = await getNextAvailablePort(desiredPort);

  if (port !== desiredPort) {
    console.warn(`⚠️ Port ${desiredPort} is currently occupied. Automatically listening on port ${port}.`);
  }

  await app.listen(port);
  console.log(`🚀 Dental Clinic ERP API running on http://localhost:${port}/api`);
}

void bootstrap();
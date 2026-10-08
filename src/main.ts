import 'reflect-metadata';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s4 = createNetServer();
    s4.once('error', () => resolve(false));
    s4.once('listening', () => {
      s4.close(() => {
        const s6 = createNetServer();
        s6.once('error', () => resolve(false));
        s6.once('listening', () => {
          s6.close(() => resolve(true));
        });
        s6.listen(port, '::');
      });
    });
    s4.listen(port, '0.0.0.0');
  });
}

async function getAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
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

  const targetPort = Number(process.env.PORT) || 3000;
  const port = await getAvailablePort(targetPort);

  if (port !== targetPort) {
    console.warn(`⚠️ Port ${targetPort} is currently in use. System auto-switched to port ${port}.`);
  }

  await app.listen(port);
  console.log(`🚀 Dental Clinic ERP API running on http://localhost:${port}/api`);
}

void bootstrap();
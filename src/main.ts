import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

async function runMigrations() {
  const prisma = createPrismaClient();
  try {
    await prisma.$connect();
    await prisma.$executeRaw`SELECT 1`; // Test connection
    console.log('Database connected ✓');
    
    // Note: For Prisma 7, migrations should be run manually:
    // docker-compose exec backend npx prisma migrate deploy
    // docker-compose exec backend npx tsx prisma/seed.ts
    if (process.env.RUN_MIGRATIONS === 'true') {
      console.log('RUN_MIGRATIONS enabled - skipping automatic migration');
      console.log('Please run manually in container: npx prisma migrate deploy');
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .map((o) => (o.startsWith('http') ? o : `https://${o}`));

  // Security headers
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — whitelist from env
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without origin (server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Run migrations before listening
  await runMigrations();

  await app.listen(port, '0.0.0.0');
  logger.log(`Backend running on http://0.0.0.0:${port}`);
  logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
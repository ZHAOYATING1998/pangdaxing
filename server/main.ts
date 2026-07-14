import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
  });

  const logger = new Logger('Bootstrap');

  app.enableCors({ origin: true, credentials: true });
  app.use(express.json({ limit: '10mb' }));

  // 静态文件 & SPA fallback（独立运行时使用；Vercel 中由 vercel.json rewrites 处理）
  const clientDir = join(process.cwd(), 'public');
  app.use(express.static(clientDir, { maxAge: '1d', index: false }));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/webhook') && !req.path.includes('.')) {
      return res.sendFile(join(clientDir, 'index.html'));
    }
    next();
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`胖大星运行在 http://0.0.0.0:${port}`);
}

// 独立运行时启动（npm start / node dist/server/main.js）
// Vercel 环境通过 api/index.ts 导入 AppModule，不会执行这段
if (!process.env.VERCEL) {
  bootstrap();
}

export { AppModule };

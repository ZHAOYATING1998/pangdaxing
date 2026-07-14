// Vercel Serverless Function — 统一入口，转发所有请求给 NestJS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../server/app.module';
import type { Express } from 'express';

// 缓存 NestJS app（Vercel warm container 复用，避免冷启动性能损失）
let cachedApp: Express | null = null;
let initPromise: Promise<Express> | null = null;

async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;

  if (!initPromise) {
    initPromise = (async () => {
      const app = await NestFactory.create(AppModule, { abortOnError: false });
      app.enableCors({ origin: true, credentials: true });
      await app.init();
      const instance = app.getHttpAdapter().getInstance() as Express;
      cachedApp = instance;
      console.log('[Vercel] NestJS initialized');
      return instance;
    })();
  }

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error('[Vercel] handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

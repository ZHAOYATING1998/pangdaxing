// 数据库模块 — 独立于妙搭平台，适配 Fly.io 部署
import { Global, Module } from '@nestjs/common';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// DRIZZLE_DATABASE 令牌（保持和妙搭平台一致的值）
export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';

// 导出类型，供 Service 注入使用
export type { PostgresJsDatabase };

// 连接工厂
function createDrizzleConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }
  const client = postgres(url, { max: 5 });
  return drizzle(client, { schema });
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      useFactory: createDrizzleConnection,
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}

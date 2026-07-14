import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@server/database';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { HelloModule } from './modules/hello/hello.module';
import { HealthModule } from './modules/health/health.module';
import { TaskModule } from './modules/task/task.module';
import { ChatModule } from './modules/chat/chat.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { FeishuCallbackModule } from './modules/feishu-callback/feishu-callback.module';
import { FeishuBotModule } from './modules/feishu-bot/feishu-bot.module';

@Module({
  imports: [
    // 数据库（全局模块，替换妙搭平台依赖）
    DatabaseModule,
    // ====== 业务模块 ======
    HelloModule,
    HealthModule,
    TaskModule,
    ChatModule,
    KnowledgeModule,
    ReminderModule,
    FeishuCallbackModule,
    FeishuBotModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { HealthModule } from './modules/health/health.module';
import { TaskModule } from './modules/task/task.module';
import { ChatModule } from './modules/chat/chat.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { FeishuCallbackModule } from './modules/feishu-callback/feishu-callback.module';
import { FeishuBotModule } from './modules/feishu-bot/feishu-bot.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    HealthModule,
    TaskModule,
    ChatModule,
    KnowledgeModule,
    ReminderModule,
    FeishuCallbackModule,
    FeishuBotModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

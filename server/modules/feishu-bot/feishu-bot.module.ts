import { Module } from '@nestjs/common';
import { FeishuBotService } from './feishu-bot.service';

@Module({
  providers: [FeishuBotService],
  exports: [FeishuBotService],
})
export class FeishuBotModule {}

import { Module } from '@nestjs/common';
import { FeishuBotService } from './feishu-bot.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [FeishuBotService],
  exports: [FeishuBotService],
})
export class FeishuBotModule {}

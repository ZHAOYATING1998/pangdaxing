import { Module } from '@nestjs/common';
import { FeishuBotService } from './feishu-bot.service';
import { FeishuBotController } from './feishu-bot.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [FeishuBotController],
  providers: [FeishuBotService],
  exports: [FeishuBotService],
})
export class FeishuBotModule {}

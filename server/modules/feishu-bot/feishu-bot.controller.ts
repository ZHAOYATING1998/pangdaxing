import { Controller, Get } from '@nestjs/common';
import { FeishuBotService } from './feishu-bot.service';

@Controller('feishu-bot')
export class FeishuBotController {
  constructor(private readonly botService: FeishuBotService) {}

  @Get('status')
  getStatus() {
    return this.botService.getStatus();
  }
}

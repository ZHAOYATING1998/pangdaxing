import { Module } from '@nestjs/common';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { ReminderScheduler } from './reminder.scheduler';
import { FeishuService } from '@server/common/feishu.service';

@Module({
  controllers: [ReminderController],
  providers: [ReminderService, ReminderScheduler, FeishuService],
})
export class ReminderModule {}

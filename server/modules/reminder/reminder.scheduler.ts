import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { FeishuService } from '@server/common/feishu.service';

@Injectable()
export class ReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReminderScheduler.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSent: Map<string, string> = new Map(); // key: reminderId_date, value: timeStr

  constructor(
    private readonly reminderService: ReminderService,
    private readonly feishuService: FeishuService,
  ) {}

  onModuleInit() {
    this.logger.log('启动提醒调度器，每60秒检查一次');
    this.intervalId = setInterval(() => this.checkReminders(), 60000);
    this.checkReminders(); // 启动时立即检查一次
  }

  async checkReminders() {
    const targetUser = process.env.FEISHU_USER_OPEN_ID;
    if (!targetUser) {
      return;
    }

    try {
      const dueReminders = await this.reminderService.getDueReminders();
      for (const reminder of dueReminders) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${reminder.id}_${today}`;
        
        // 避免同一分钟内重复发送
        if (this.lastSent.get(key) === reminder.reminderTime) {
          continue;
        }

        this.lastSent.set(key, reminder.reminderTime);
        const sent = await this.feishuService.sendMessage(targetUser, reminder.message);
        
        if (sent) {
          this.logger.log(`提醒已发送: ${reminder.name} (${reminder.reminderTime})`);
        }
      }
    } catch (error) {
      this.logger.error('检查提醒失败', error);
    }
  }
}

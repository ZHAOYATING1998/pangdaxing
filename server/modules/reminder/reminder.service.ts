import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@server/database';
import { reminderConfigs } from '@server/database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getReminders(userId: string) {
    return this.db
      .select()
      .from(reminderConfigs)
      .where(eq(reminderConfigs.userProfile, userId));
  }

  async createReminder(data: { name: string; reminderTime: string; message: string; daysOfWeek?: string; userProfile: string }) {
    const [reminder] = await this.db.insert(reminderConfigs).values(data).returning();
    return reminder;
  }

  async updateReminder(id: string, userId: string, data: Partial<{ name: string; reminderTime: string; message: string; daysOfWeek: string; isActive: boolean }>) {
    const [updated] = await this.db
      .update(reminderConfigs)
      .set(data)
      .where(and(eq(reminderConfigs.id, id), eq(reminderConfigs.userProfile, userId)))
      .returning();
    return updated;
  }

  async deleteReminder(id: string, userId: string) {
    return this.db
      .delete(reminderConfigs)
      .where(and(eq(reminderConfigs.id, id), eq(reminderConfigs.userProfile, userId)));
  }

  // 获取当前时间应该触发的提醒
  async getDueReminders() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一...6=周六
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 转换: 1-7
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const allReminders = await this.db
      .select()
      .from(reminderConfigs)
      .where(eq(reminderConfigs.isActive, true));

    // 筛选当前时间匹配的提醒
    return allReminders.filter((r) => {
      const timeMatch = r.reminderTime === timeStr;
      const dayMatch = r.daysOfWeek.split(',').map(Number).includes(normalizedDay);
      return timeMatch && dayMatch;
    });
  }
}

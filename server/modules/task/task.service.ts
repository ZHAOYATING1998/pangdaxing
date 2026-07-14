import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@server/database';
import { dailyTasks, taskCompletions } from '@server/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  // ==================== 任务模板 ====================
  async getTasks(userId: string) {
    return this.db
      .select()
      .from(dailyTasks)
      .where(and(
        eq(dailyTasks.userProfile, userId),
        eq(dailyTasks.isActive, true),
      ))
      .orderBy(desc(dailyTasks.sortOrder));
  }

  async createTask(data: { title: string; description?: string; category?: string; icon?: string; sortOrder?: number; userProfile: string }) {
    const [task] = await this.db.insert(dailyTasks).values(data).returning();
    return task;
  }

  async updateTask(id: string, userId: string, data: Partial<{ title: string; description: string; category: string; icon: string; sortOrder: number; isActive: boolean }>) {
    const [updated] = await this.db
      .update(dailyTasks)
      .set(data)
      .where(and(eq(dailyTasks.id, id), eq(dailyTasks.userProfile, userId)))
      .returning();
    return updated;
  }

  async deleteTask(id: string, userId: string) {
    return this.db
      .delete(dailyTasks)
      .where(and(eq(dailyTasks.id, id), eq(dailyTasks.userProfile, userId)));
  }

  // ==================== 任务完成记录 ====================
  async getTodayCompletions(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.db
      .select()
      .from(taskCompletions)
      .where(and(
        eq(taskCompletions.userProfile, userId),
        gte(taskCompletions.completedDate, today),
        lte(taskCompletions.completedDate, tomorrow),
      ));
  }

  async completeTask(data: { taskId: string; completedDate: Date; notes?: string; userProfile: string }) {
    const [record] = await this.db.insert(taskCompletions).values(data).returning();
    return record;
  }

  async uncompleteTask(taskId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.db
      .delete(taskCompletions)
      .where(and(
        eq(taskCompletions.taskId, taskId),
        eq(taskCompletions.userProfile, userId),
        gte(taskCompletions.completedDate, today),
        lte(taskCompletions.completedDate, tomorrow),
      ));
  }

  // 获取本周完成统计
  async getWeeklyStats(userId: string) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 周一
    weekStart.setHours(0, 0, 0, 0);

    const completions = await this.db
      .select()
      .from(taskCompletions)
      .where(and(
        eq(taskCompletions.userProfile, userId),
        gte(taskCompletions.completedDate, weekStart),
      ));

    // 按日期分组统计
    const stats: Record<string, number> = {};
    completions.forEach((c) => {
      const dateStr = new Date(c.completedDate).toISOString().split('T')[0];
      stats[dateStr] = (stats[dateStr] || 0) + 1;
    });

    return stats;
  }
}

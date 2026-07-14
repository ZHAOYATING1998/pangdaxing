import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@server/database';
import { healthRecords, dietRecords, exerciseRecords, userGoals } from '@server/database/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  // ==================== 体重记录 ====================
  async getWeightRecords(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.db
      .select()
      .from(healthRecords)
      .where(and(
        eq(healthRecords.userProfile, userId),
        gte(healthRecords.recordDate, since),
      ))
      .orderBy(desc(healthRecords.recordDate));
  }

  async addWeightRecord(data: { weight: number; recordDate: Date; bodyFat?: number; waist?: number; notes?: string; userProfile: string }) {
    const [record] = await this.db.insert(healthRecords).values(data).returning();
    return record;
  }

  async deleteWeightRecord(id: string, userId: string) {
    return this.db
      .delete(healthRecords)
      .where(and(eq(healthRecords.id, id), eq(healthRecords.userProfile, userId)));
  }

  // ==================== 饮食记录 ====================
  async getDietRecords(userId: string, date?: string) {
    let query = this.db
      .select()
      .from(dietRecords)
      .where(eq(dietRecords.userProfile, userId))
      .orderBy(desc(dietRecords.recordDate));

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      // Use the direct drizzle query builder without chaining .where()
      return this.db
        .select()
        .from(dietRecords)
        .where(and(
          eq(dietRecords.userProfile, userId),
          gte(dietRecords.recordDate, start),
          lte(dietRecords.recordDate, end),
        ))
        .orderBy(desc(dietRecords.recordDate));
    }
    return query.limit(50);
  }

  async addDietRecord(data: { recordDate: Date; mealType: string; foodName: string; calories?: number; portion?: string; notes?: string; photoUrl?: string; userProfile: string }) {
    const [record] = await this.db.insert(dietRecords).values(data).returning();
    return record;
  }

  async deleteDietRecord(id: string, userId: string) {
    return this.db
      .delete(dietRecords)
      .where(and(eq(dietRecords.id, id), eq(dietRecords.userProfile, userId)));
  }

  // ==================== 运动记录 ====================
  async getExerciseRecords(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.db
      .select()
      .from(exerciseRecords)
      .where(and(
        eq(exerciseRecords.userProfile, userId),
        gte(exerciseRecords.recordDate, since),
      ))
      .orderBy(desc(exerciseRecords.recordDate));
  }

  async addExerciseRecord(data: { recordDate: Date; exerciseType: string; duration?: number; caloriesBurned?: number; intensity?: string; notes?: string; userProfile: string }) {
    const [record] = await this.db.insert(exerciseRecords).values(data).returning();
    return record;
  }

  async deleteExerciseRecord(id: string, userId: string) {
    return this.db
      .delete(exerciseRecords)
      .where(and(eq(exerciseRecords.id, id), eq(exerciseRecords.userProfile, userId)));
  }

  // ==================== 目标管理 ====================
  async getGoals(userId: string) {
    return this.db
      .select()
      .from(userGoals)
      .where(eq(userGoals.userProfile, userId))
      .orderBy(desc(userGoals.createdAt));
  }

  async setGoal(data: { targetWeight: number; startWeight: number; startDate: Date; targetDate?: Date; dailyCalorieTarget?: number; weeklyExerciseTarget?: number; notes?: string; userProfile: string }) {
    const [goal] = await this.db.insert(userGoals).values({ ...data, status: 'active' }).returning();
    return goal;
  }

  async updateGoal(id: string, userId: string, data: Partial<{ targetWeight: number; dailyCalorieTarget: number; weeklyExerciseTarget: number; status: string; notes: string }>) {
    const [updated] = await this.db
      .update(userGoals)
      .set(data)
      .where(and(eq(userGoals.id, id), eq(userGoals.userProfile, userId)))
      .returning();
    return updated;
  }

  // ==================== 看板统计 ====================
  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 最新体重
    const [latestWeight] = await this.db
      .select({ weight: healthRecords.weight, date: healthRecords.recordDate })
      .from(healthRecords)
      .where(eq(healthRecords.userProfile, userId))
      .orderBy(desc(healthRecords.recordDate))
      .limit(1);

    // 本周日均热量
    const weekDiets = await this.db
      .select({ calories: dietRecords.calories })
      .from(dietRecords)
      .where(and(
        eq(dietRecords.userProfile, userId),
        gte(dietRecords.recordDate, weekAgo),
      ));

    const avgCalories = weekDiets.length > 0
      ? Math.round(weekDiets.reduce((sum, d) => sum + (d.calories || 0), 0) / 7)
      : 0;

    // 本周运动次数
    const weekExercises = await this.db
      .select()
      .from(exerciseRecords)
      .where(and(
        eq(exerciseRecords.userProfile, userId),
        gte(exerciseRecords.recordDate, weekAgo),
      ));

    // 当前目标
    const [activeGoal] = await this.db
      .select()
      .from(userGoals)
      .where(and(
        eq(userGoals.userProfile, userId),
        eq(userGoals.status, 'active'),
      ))
      .limit(1);

    return {
      currentWeight: latestWeight?.weight ?? null,
      weightDate: latestWeight?.date ?? null,
      avgDailyCalories: avgCalories,
      weeklyExerciseCount: weekExercises.length,
      todayIntake: await this.getTodayCalories(userId),
      activeGoal,
    };
  }

  private async getTodayCalories(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await this.db
      .select({ calories: dietRecords.calories })
      .from(dietRecords)
      .where(and(
        eq(dietRecords.userProfile, userId),
        gte(dietRecords.recordDate, today),
        lte(dietRecords.recordDate, tomorrow),
      ));

    return records.reduce((sum, r) => sum + (r.calories || 0), 0);
  }
}

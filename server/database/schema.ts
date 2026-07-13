/** auto generated, do not edit */
import { pgTable, uuid, varchar, text, integer, real, boolean, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number};
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number){
    if(value == null) return value as any;
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if(typeof value === 'string') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if(value instanceof Date) return value;
    return new Date(value);
  },
});

// ============================================================
// 胖大星 - 减肥管理智能体 数据库表
// ============================================================

// 体重记录表
export const healthRecords = pgTable("health_records", {
  id: uuid().defaultRandom().notNull(),
  recordDate: customTimestamptz("record_date").notNull(),
  weight: real("weight").notNull(),           // 体重 (kg)
  bodyFat: real("body_fat"),                   // 体脂率 (%)
  waist: real("waist"),                        // 腰围 (cm)
  notes: text("notes"),                        // 备注
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 饮食记录表
export const dietRecords = pgTable("diet_records", {
  id: uuid().defaultRandom().notNull(),
  recordDate: customTimestamptz("record_date").notNull(),
  mealType: varchar("meal_type", { length: 50 }).notNull(),  // breakfast/lunch/dinner/snack
  foodName: varchar("food_name", { length: 255 }).notNull(),
  calories: real("calories"),                                // 热量 (kcal)
  portion: varchar("portion", { length: 100 }),              // 份量
  notes: text("notes"),
  photoUrl: text("photo_url"),                               // 食物照片
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 运动记录表
export const exerciseRecords = pgTable("exercise_records", {
  id: uuid().defaultRandom().notNull(),
  recordDate: customTimestamptz("record_date").notNull(),
  exerciseType: varchar("exercise_type", { length: 100 }).notNull(), // running/swimming/yoga/etc
  duration: integer("duration"),                                      // 时长 (分钟)
  caloriesBurned: real("calories_burned"),                            // 消耗热量 (kcal)
  intensity: varchar("intensity", { length: 50 }),                    // low/medium/high
  notes: text("notes"),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 用户减肥目标表
export const userGoals = pgTable("user_goals", {
  id: uuid().defaultRandom().notNull(),
  targetWeight: real("target_weight").notNull(),            // 目标体重 (kg)
  startWeight: real("start_weight").notNull(),              // 起始体重 (kg)
  startDate: customTimestamptz("start_date").notNull(),
  targetDate: customTimestamptz("target_date"),
  dailyCalorieTarget: integer("daily_calorie_target"),     // 每日热量目标
  weeklyExerciseTarget: integer("weekly_exercise_target"), // 每周运动次数
  status: varchar("status", { length: 50 }).default("active"), // active/completed/abandoned
  notes: text("notes"),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 聊天会话表
export const chatSessions = pgTable("chat_sessions", {
  id: uuid().defaultRandom().notNull(),
  title: varchar("title", { length: 255 }).default("新对话"),
  lastMessage: text("last_message"),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 聊天消息表
export const chatMessages = pgTable("chat_messages", {
  id: uuid().defaultRandom().notNull(),
  sessionId: uuid("session_id").notNull(),                  // 关联 chat_sessions.id
  role: varchar("role", { length: 50 }).notNull(),          // user / assistant
  content: text("content").notNull(),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 知识库文档表
export const knowledgeDocs = pgTable("knowledge_docs", {
  id: uuid().defaultRandom().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("general"), // diet/exercise/motivation/general
  content: text("content").notNull(),
  source: varchar("source", { length: 255 }),              // 来源
  isPinned: boolean("is_pinned").default(false),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 每日任务模板表
export const dailyTasks = pgTable("daily_tasks", {
  id: uuid().defaultRandom().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("daily"), // weight/diet/exercise/other
  icon: varchar("icon", { length: 50 }),                  // emoji 图标
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 任务完成记录表
export const taskCompletions = pgTable("task_completions", {
  id: uuid().defaultRandom().notNull(),
  taskId: uuid("task_id").notNull(),
  completedDate: customTimestamptz("completed_date").notNull(),
  completedAt: customTimestamptz("completed_at").default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

// 提醒配置表
export const reminderConfigs = pgTable("reminder_configs", {
  id: uuid().defaultRandom().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  reminderTime: varchar("reminder_time", { length: 10 }).notNull(),  // HH:mm 格式
  message: text("message").notNull(),
  daysOfWeek: varchar("days_of_week", { length: 50 }).default("1,2,3,4,5,6,7"), // 逗号分隔，1=周一
  isActive: boolean("is_active").default(true),
  userProfile: userProfile("user_profile").notNull(),
  createdAt: customTimestamptz("_created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: userProfile("_created_by"),
  updatedAt: customTimestamptz("_updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedBy: userProfile("_updated_by"),
});

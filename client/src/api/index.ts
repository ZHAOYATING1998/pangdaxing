import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

// ==================== 健康数据 API ====================
export async function getHealthStats() {
  const { data } = await axiosForBackend({ url: '/api/health/stats', method: 'GET' });
  return data;
}

export async function getWeightRecords(days = 30) {
  const { data } = await axiosForBackend({ url: `/api/health/weight?days=${days}`, method: 'GET' });
  return data;
}

export async function addWeightRecord(record: { weight: number; recordDate: string; bodyFat?: number; waist?: number; notes?: string }) {
  const { data } = await axiosForBackend({ url: '/api/health/weight', method: 'POST', data: record });
  return data;
}

export async function getDietRecords(date?: string) {
  const params = date ? `?date=${date}` : '';
  const { data } = await axiosForBackend({ url: `/api/health/diet${params}`, method: 'GET' });
  return data;
}

export async function addDietRecord(record: { recordDate: string; mealType: string; foodName: string; calories?: number; portion?: string; notes?: string }) {
  const { data } = await axiosForBackend({ url: '/api/health/diet', method: 'POST', data: record });
  return data;
}

export async function getExerciseRecords(days = 30) {
  const { data } = await axiosForBackend({ url: `/api/health/exercise?days=${days}`, method: 'GET' });
  return data;
}

export async function addExerciseRecord(record: { recordDate: string; exerciseType: string; duration?: number; caloriesBurned?: number; intensity?: string; notes?: string }) {
  const { data } = await axiosForBackend({ url: '/api/health/exercise', method: 'POST', data: record });
  return data;
}

export async function getGoals() {
  const { data } = await axiosForBackend({ url: '/api/health/goals', method: 'GET' });
  return data;
}

export async function setGoal(goal: { targetWeight: number; startWeight: number; startDate: string; targetDate?: string; dailyCalorieTarget?: number; weeklyExerciseTarget?: number; notes?: string }) {
  const { data } = await axiosForBackend({ url: '/api/health/goals', method: 'POST', data: goal });
  return data;
}

// ==================== 任务 API ====================
export async function getTasks() {
  const { data } = await axiosForBackend({ url: '/api/tasks', method: 'GET' });
  return data;
}

export async function createTask(task: { title: string; description?: string; category?: string; icon?: string }) {
  const { data } = await axiosForBackend({ url: '/api/tasks', method: 'POST', data: task });
  return data;
}

export async function getTodayCompletions() {
  const { data } = await axiosForBackend({ url: '/api/tasks/completions', method: 'GET' });
  return data;
}

export async function completeTask(taskId: string) {
  const { data } = await axiosForBackend({ url: `/api/tasks/${taskId}/complete`, method: 'POST' });
  return data;
}

export async function uncompleteTask(taskId: string) {
  const { data } = await axiosForBackend({ url: `/api/tasks/${taskId}/complete`, method: 'DELETE' });
  return data;
}

export async function getWeeklyTaskStats() {
  const { data } = await axiosForBackend({ url: '/api/tasks/stats/weekly', method: 'GET' });
  return data;
}

// ==================== 聊天 API ====================
export async function getChatSessions() {
  const { data } = await axiosForBackend({ url: '/api/chat/sessions', method: 'GET' });
  return data;
}

export async function createChatSession(title?: string) {
  const { data } = await axiosForBackend({ url: '/api/chat/sessions', method: 'POST', data: { title } });
  return data;
}

export async function getChatMessages(sessionId: string) {
  const { data } = await axiosForBackend({ url: `/api/chat/sessions/${sessionId}/messages`, method: 'GET' });
  return data;
}

export async function sendChatMessage(sessionId: string, message: string) {
  const { data } = await axiosForBackend({ url: '/api/chat/send', method: 'POST', data: { sessionId, message } });
  return data;
}

// ==================== 知识库 API ====================
export async function getKnowledgeDocs(category?: string, keyword?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (keyword) params.set('keyword', keyword);
  const query = params.toString() ? `?${params.toString()}` : '';
  const { data } = await axiosForBackend({ url: `/api/knowledge${query}`, method: 'GET' });
  return data;
}

export async function createKnowledgeDoc(doc: { title: string; category?: string; content: string; source?: string }) {
  const { data } = await axiosForBackend({ url: '/api/knowledge', method: 'POST', data: doc });
  return data;
}

export async function updateKnowledgeDoc(id: string, doc: Partial<{ title: string; category: string; content: string; isPinned: boolean }>) {
  const { data } = await axiosForBackend({ url: `/api/knowledge/${id}`, method: 'PUT', data: doc });
  return data;
}

export async function deleteKnowledgeDoc(id: string) {
  const { data } = await axiosForBackend({ url: `/api/knowledge/${id}`, method: 'DELETE' });
  return data;
}

// ==================== 提醒 API ====================
export async function getReminders() {
  const { data } = await axiosForBackend({ url: '/api/reminders', method: 'GET' });
  return data;
}

export async function createReminder(reminder: { name: string; reminderTime: string; message: string; daysOfWeek?: string }) {
  const { data } = await axiosForBackend({ url: '/api/reminders', method: 'POST', data: reminder });
  return data;
}

export async function updateReminder(id: string, reminder: Partial<{ name: string; reminderTime: string; message: string; daysOfWeek: string; isActive: boolean }>) {
  const { data } = await axiosForBackend({ url: `/api/reminders/${id}`, method: 'PUT', data: reminder });
  return data;
}

export async function deleteReminder(id: string) {
  const { data } = await axiosForBackend({ url: `/api/reminders/${id}`, method: 'DELETE' });
  return data;
}

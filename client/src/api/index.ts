// 胖大星 API 客户端 — Vercel 部署版
// 不依赖妙搭平台 SDK，直接用 fetch 调用后端 API

const API_BASE = ''; // 同域部署

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as any;

  return res.json();
}

const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// ==================== 健康数据 API ====================
export async function getHealthStats() {
  return request('/api/health/stats');
}

export async function getWeightRecords(days = 30) {
  return request(`/api/health/weight?days=${days}`);
}

export async function addWeightRecord(record: { weight: number; recordDate: string; bodyFat?: number; waist?: number; notes?: string }) {
  return request('/api/health/weight', { method: 'POST', body: JSON.stringify(record) });
}

export async function getDietRecords(date?: string) {
  const params = date ? `?date=${date}` : '';
  return request(`/api/health/diet${params}`);
}

export async function addDietRecord(record: { recordDate: string; mealType: string; foodName: string; calories?: number; portion?: string; notes?: string }) {
  return request('/api/health/diet', { method: 'POST', body: JSON.stringify(record) });
}

export async function getExerciseRecords(days = 30) {
  return request(`/api/health/exercise?days=${days}`);
}

export async function addExerciseRecord(record: { recordDate: string; exerciseType: string; duration?: number; caloriesBurned?: number; intensity?: string; notes?: string }) {
  return request('/api/health/exercise', { method: 'POST', body: JSON.stringify(record) });
}

export async function getGoals() {
  return request('/api/health/goals');
}

export async function setGoal(goal: { targetWeight: number; startWeight: number; startDate: string; targetDate?: string; dailyCalorieTarget?: number; weeklyExerciseTarget?: number; notes?: string }) {
  return request('/api/health/goals', { method: 'POST', body: JSON.stringify(goal) });
}

// ==================== 任务 API ====================
export async function getTasks() {
  return request('/api/tasks');
}

export async function createTask(task: { title: string; description?: string; category?: string; icon?: string }) {
  return request('/api/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export async function getTodayCompletions() {
  return request('/api/tasks/completions');
}

export async function completeTask(taskId: string) {
  return request(`/api/tasks/${taskId}/complete`, { method: 'POST' });
}

export async function uncompleteTask(taskId: string) {
  return request(`/api/tasks/${taskId}/complete`, { method: 'DELETE' });
}

export async function getWeeklyTaskStats() {
  return request('/api/tasks/stats/weekly');
}

// ==================== 聊天 API ====================
export async function getChatSessions() {
  return request('/api/chat/sessions');
}

export async function createChatSession(title?: string) {
  return request('/api/chat/sessions', { method: 'POST', body: JSON.stringify({ title }) });
}

export async function getChatMessages(sessionId: string) {
  return request(`/api/chat/sessions/${sessionId}/messages`);
}

export async function sendChatMessage(sessionId: string, message: string) {
  return request('/api/chat/send', { method: 'POST', body: JSON.stringify({ sessionId, message }) });
}

// ==================== 知识库 API ====================
export async function getKnowledgeDocs(category?: string, keyword?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (keyword) params.set('keyword', keyword);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/knowledge${query}`);
}

export async function createKnowledgeDoc(doc: { title: string; category?: string; content: string; source?: string }) {
  return request('/api/knowledge', { method: 'POST', body: JSON.stringify(doc) });
}

export async function updateKnowledgeDoc(id: string, doc: Partial<{ title: string; category: string; content: string; isPinned: boolean }>) {
  return request(`/api/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(doc) });
}

export async function deleteKnowledgeDoc(id: string) {
  return request(`/api/knowledge/${id}`, { method: 'DELETE' });
}

// ==================== 提醒 API ====================
export async function getReminders() {
  return request('/api/reminders');
}

export async function createReminder(reminder: { name: string; reminderTime: string; message: string; daysOfWeek?: string }) {
  return request('/api/reminders', { method: 'POST', body: JSON.stringify(reminder) });
}

export async function updateReminder(id: string, reminder: Partial<{ name: string; reminderTime: string; message: string; daysOfWeek: string; isActive: boolean }>) {
  return request(`/api/reminders/${id}`, { method: 'PUT', body: JSON.stringify(reminder) });
}

export async function deleteReminder(id: string) {
  return request(`/api/reminders/${id}`, { method: 'DELETE' });
}

export { logger };

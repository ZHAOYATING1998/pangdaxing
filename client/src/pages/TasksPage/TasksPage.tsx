import { useState, useEffect } from "react";
import { Plus, Trash2, CheckSquare } from "lucide-react";
import { getTasks, createTask, getTodayCompletions, completeTask, uncompleteTask, getWeeklyTaskStats } from "../../api";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: "", category: "daily", icon: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [t, c, w] = await Promise.all([
        getTasks(), getTodayCompletions(), getWeeklyTaskStats(),
      ]);
      setTasks(t || []);
      setCompletions(c || []);
      setWeeklyStats(w || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleToggle(taskId: string, isDone: boolean) {
    try {
      isDone ? await uncompleteTask(taskId) : await completeTask(taskId);
      setCompletions(await getTodayCompletions() || []);
    } catch (e) { console.error(e); }
  }

  async function handleCreate() {
    if (!newTask.title.trim()) return;
    try {
      await createTask(newTask);
      setNewTask({ title: "", category: "daily", icon: "" });
      setTasks(await getTasks() || []);
    } catch (e) { console.error(e); }
  }

  const completedIds = new Set(completions.map((c: any) => c.taskId));
  const doneCount = completions.length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const icons = ["⚖️", "🍽️", "🏃", "💧", "😴", "📝"];
  const categories = [
    { value: "weight", label: "称重" },
    { value: "diet", label: "饮食" },
    { value: "exercise", label: "运动" },
    { value: "daily", label: "日常" },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">每日任务</h1>
        <p className="text-sm text-gray-500 mt-1">坚持打卡，养成好习惯</p>
      </div>

      {/* 进度条 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">今日进度</span>
          <span className="text-sm text-gray-400">{doneCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && <p className="text-sm text-green-600 mt-2">🎉 太棒了！今日任务全部完成！</p>}
        {progress > 0 && progress < 100 && <p className="text-sm text-blue-600 mt-2">💪 继续加油，还有 {totalCount - doneCount} 项待完成</p>}
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {tasks.length > 0 ? (
          tasks.map((task: any) => {
            const isDone = completedIds.has(task.id);
            return (
              <div key={task.id} className={`flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0 ${isDone ? "bg-green-50/50" : ""}`}>
                <button onClick={() => handleToggle(task.id, isDone)} className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isDone ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-gray-400"
                  }`}>
                    {isDone && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
                <span className="text-xl">{task.icon || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-800"}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{categories.find(c => c.value === task.category)?.label || task.category}</span>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CheckSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">还没有任务，创建你的第一个每日习惯吧</p>
          </div>
        )}
      </div>

      {/* 创建新任务 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">添加新任务</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入任务名称..."
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={newTask.icon}
            onChange={(e) => setNewTask({ ...newTask, icon: e.target.value })}
            className="px-2 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">图标</option>
            {icons.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1">
            <Plus className="w-4 h-4" />添加
          </button>
        </div>
      </div>
    </div>
  );
}

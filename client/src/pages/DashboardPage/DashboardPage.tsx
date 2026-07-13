import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingDown,
  Flame,
  Dumbbell,
  Target,
  Plus,
  ArrowUpRight,
  CheckSquare,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getHealthStats,
  getWeightRecords,
  getTasks,
  getTodayCompletions,
  completeTask,
  uncompleteTask,
  addWeightRecord,
} from "../../api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightForm, setWeightForm] = useState({ weight: "", date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, weightData, tasksData, completionsData] = await Promise.all([
        getHealthStats(),
        getWeightRecords(30),
        getTasks(),
        getTodayCompletions(),
      ]);
      setStats(statsData);
      setWeightData(weightData.reverse());
      setTasks(tasksData || []);
      setCompletions(completionsData || []);
    } catch (e) {
      console.error("加载数据失败", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTask(taskId: string, isCompleted: boolean) {
    try {
      if (isCompleted) {
        await uncompleteTask(taskId);
      } else {
        await completeTask(taskId);
      }
      const updated = await getTodayCompletions();
      setCompletions(updated || []);
    } catch (e) {
      console.error("操作失败", e);
    }
  }

  async function handleAddWeight() {
    if (!weightForm.weight) return;
    try {
      await addWeightRecord({
        weight: parseFloat(weightForm.weight),
        recordDate: new Date(weightForm.date).toISOString(),
      });
      setShowWeightForm(false);
      setWeightForm({ weight: "", date: new Date().toISOString().split("T")[0] });
      loadData();
    } catch (e) {
      console.error("记录失败", e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const completedIds = new Set(completions.map((c: any) => c.taskId));
  const weightProgress = stats?.activeGoal
    ? Math.round(((stats.activeGoal.startWeight - (stats.currentWeight || stats.activeGoal.startWeight)) /
        (stats.activeGoal.startWeight - stats.activeGoal.targetWeight)) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            ⭐ 胖大星，下午好！
          </h1>
          <p className="text-sm text-gray-500 mt-1">每一天都离目标更近一步</p>
        </div>
        <button
          onClick={() => setShowWeightForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          记录体重
        </button>
      </div>

      {/* 快捷记录弹窗 */}
      {showWeightForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowWeightForm(false)}>
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">记录体重</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">日期</label>
                <input
                  type="date"
                  value={weightForm.date}
                  onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="例如 65.5"
                  value={weightForm.weight}
                  onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowWeightForm(false)} className="flex-1 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={handleAddWeight} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">当前体重</p>
            <TrendingDown className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.currentWeight ?? "--"} <span className="text-sm font-normal text-gray-400">kg</span></p>
          {stats?.activeGoal && (
            <p className="text-xs text-gray-400 mt-1">
              目标 {stats.activeGoal.targetWeight} kg
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">今日摄入</p>
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.todayIntake ?? 0} <span className="text-sm font-normal text-gray-400">kcal</span></p>
          {stats?.activeGoal?.dailyCalorieTarget && (
            <p className="text-xs text-gray-400 mt-1">
              目标 {stats.activeGoal.dailyCalorieTarget} kcal
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">本周运动</p>
            <Dumbbell className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats?.weeklyExerciseCount ?? 0} <span className="text-sm font-normal text-gray-400">次</span></p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">目标进度</p>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{Math.max(0, weightProgress)}<span className="text-sm font-normal text-gray-400">%</span></p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, weightProgress))}%` }} />
          </div>
        </div>
      </div>

      {/* 体重趋势 + 今日任务 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 体重趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">体重趋势</h3>
            <span className="text-xs text-gray-400">近30天</span>
          </div>
          {weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightData.map((d: any) => ({
                date: new Date(d.recordDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
                weight: d.weight,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#999" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} stroke="#999" />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <TrendingDown className="w-10 h-10 mb-2" />
              <p className="text-sm">还没有体重记录</p>
              <p className="text-xs mt-1">点击右上角「记录体重」开始</p>
            </div>
          )}
        </div>

        {/* 今日任务 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">今日任务</h3>
            <button
              onClick={() => navigate("/tasks")}
              className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              全部 <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task: any) => {
                const isDone = completedIds.has(task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => handleToggleTask(task.id, isDone)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      isDone ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isDone ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}>
                      {isDone && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={isDone ? "line-through" : ""}>{task.title}</span>
                    {task.icon && <span className="ml-auto">{task.icon}</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckSquare className="w-8 h-8 mb-2" />
              <p className="text-sm">还没有任务</p>
              <p className="text-xs mt-1">去任务页面创建每日习惯</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

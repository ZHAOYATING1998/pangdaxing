import { useState, useEffect } from "react";
import { Plus, Trash2, Bell, Clock, ToggleLeft, ToggleRight, X } from "lucide-react";
import { getReminders, createReminder, updateReminder, deleteReminder } from "../../api";

const weekDays = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

const presetReminders = [
  { name: "晨起称重", time: "08:00", message: "🌅 早上好！别忘了称体重哦，记录每一天的变化~", days: "1,2,3,4,5,6,7" },
  { name: "记录午餐", time: "12:30", message: "🍽️ 午饭时间！记得记录今天吃了什么，控制热量摄入~", days: "1,2,3,4,5,6,7" },
  { name: "晚间运动", time: "19:00", message: "🏃 下班了！今天运动了吗？哪怕散个步也好~", days: "1,2,3,4,5,6,7" },
  { name: "睡前复盘", time: "22:00", message: "🌙 准备休息啦！回顾一下今天的减肥成果，明天继续加油！", days: "1,2,3,4,5,6,7" },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reminderTime: "08:00",
    message: "",
    daysOfWeek: "1,2,3,4,5,6,7",
  });

  useEffect(() => { loadReminders(); }, []);

  async function loadReminders() {
    setLoading(true);
    try {
      const data = await getReminders();
      setReminders(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.message.trim()) return;
    try {
      await createReminder(form);
      setForm({ name: "", reminderTime: "08:00", message: "", daysOfWeek: "1,2,3,4,5,6,7" });
      setShowForm(false);
      loadReminders();
    } catch (e) { console.error(e); }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      await updateReminder(id, { isActive: !currentActive });
      loadReminders();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个提醒吗？")) return;
    try { await deleteReminder(id); loadReminders(); }
    catch (e) { console.error(e); }
  }

  function fillPreset(preset: typeof presetReminders[0]) {
    setForm({
      name: preset.name,
      reminderTime: preset.time,
      message: preset.message,
      daysOfWeek: preset.days,
    });
  }

  function toggleDay(day: number) {
    const days = form.daysOfWeek.split(",").map(Number);
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    days.sort();
    setForm({ ...form, daysOfWeek: days.join(",") });
  }

  const selectedDays = form.daysOfWeek.split(",").map(Number);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">提醒设置</h1>
          <p className="text-sm text-gray-500 mt-1">设置每日提醒，让胖大星准时督促你</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          <Plus className="w-4 h-4" />添加提醒
        </button>
      </div>

      {/* 预设模板 */}
      {reminders.length === 0 && (
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-sm font-medium text-yellow-800 mb-3">💡 快速添加推荐提醒：</p>
          <div className="grid grid-cols-2 gap-2">
            {presetReminders.map((p) => (
              <button
                key={p.name}
                onClick={() => { fillPreset(p); setShowForm(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-yellow-200 text-sm text-gray-700 hover:bg-yellow-50 transition-colors"
              >
                <Bell className="w-4 h-4 text-yellow-500" />
                <div className="text-left">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.time}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 已有提醒列表 */}
      <div className="space-y-3">
        {reminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <Bell className="w-10 h-10 mb-2" />
            <p className="text-sm">还没有提醒</p>
          </div>
        )}
        {reminders.map((r: any) => {
          const days = r.daysOfWeek.split(",").map(Number);
          return (
            <div key={r.id} className={`bg-white rounded-xl p-4 shadow-sm border transition-colors ${r.isActive ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{r.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{r.reminderTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(r.id, r.isActive)} className="p-1">
                    {r.isActive ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{r.message}</p>
              <div className="flex gap-1 mt-2">
                {weekDays.map((d) => (
                  <span key={d.value} className={`text-xs px-2 py-0.5 rounded-full ${
                    days.includes(d.value) ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-300"
                  }`}>
                    {d.label.slice(0, 1)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 创建弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">添加提醒</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">名称</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="例如：晨起称重" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">时间</label>
                <input type="time" value={form.reminderTime} onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">提醒消息</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="输入提醒内容..." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">重复日期</label>
                <div className="flex gap-1">
                  {weekDays.map((d) => (
                    <button key={d.value} onClick={() => toggleDay(d.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedDays.includes(d.value) ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {d.label.slice(0, 1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

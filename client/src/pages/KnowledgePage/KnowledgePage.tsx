import { useState, useEffect } from "react";
import { Plus, Search, Edit3, Trash2, Pin, BookOpen, X } from "lucide-react";
import { getKnowledgeDocs, createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc } from "../../api";

const categories = [
  { value: "all", label: "全部" },
  { value: "diet", label: "饮食" },
  { value: "exercise", label: "运动" },
  { value: "motivation", label: "激励" },
  { value: "knowledge", label: "知识" },
  { value: "general", label: "通用" },
];

export default function KnowledgePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", category: "general", content: "", source: "" });

  useEffect(() => { loadDocs(); }, [filter]);

  async function loadDocs() {
    setLoading(true);
    try {
      const data = await getKnowledgeDocs(filter === "all" ? undefined : filter, keyword || undefined);
      setDocs(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      await createKnowledgeDoc(form);
      setForm({ title: "", category: "general", content: "", source: "" });
      setShowForm(false);
      loadDocs();
    } catch (e) { console.error(e); }
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      await updateKnowledgeDoc(editing.id, {
        title: editing.title,
        category: editing.category,
        content: editing.content,
        isPinned: editing.isPinned,
      });
      setEditing(null);
      loadDocs();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条知识吗？")) return;
    try { await deleteKnowledgeDoc(id); loadDocs(); }
    catch (e) { console.error(e); }
  }

  function openEdit(doc: any) {
    setEditing({ ...doc });
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">知识库</h1>
          <p className="text-sm text-gray-500 mt-1">储存和管理你的减肥知识、食谱和运动方案</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          <Plus className="w-4 h-4" />添加知识
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadDocs()}
            placeholder="搜索知识..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === c.value ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 知识列表 */}
      <div className="space-y-3">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
            <BookOpen className="w-10 h-10 mb-2" />
            <p className="text-sm">还没有知识条目</p>
            <p className="text-xs mt-1">添加你的减肥知识、食谱或运动方案</p>
          </div>
        ) : (
          docs.map((doc: any) => (
            <div key={doc.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {doc.isPinned && <Pin className="w-3 h-3 text-yellow-500" />}
                  <h3 className="font-bold text-gray-800">{doc.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {categories.find(c => c.value === doc.category)?.label || doc.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(doc)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">{doc.content}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                {doc.source && <span>来源: {doc.source}</span>}
                <span>{new Date(doc.createdAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {(showForm || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? "编辑知识" : "添加知识"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">标题</label>
                <input
                  type="text"
                  value={editing ? editing.title : form.title}
                  onChange={(e) => editing ? setEditing({ ...editing, title: e.target.value }) : setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="例如：低卡午餐食谱"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">分类</label>
                <select
                  value={editing ? editing.category : form.category}
                  onChange={(e) => editing ? setEditing({ ...editing, category: e.target.value }) : setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {categories.filter(c => c.value !== "all").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">内容</label>
                <textarea
                  value={editing ? editing.content : form.content}
                  onChange={(e) => editing ? setEditing({ ...editing, content: e.target.value }) : setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="输入知识内容..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">来源（可选）</label>
                <input
                  type="text"
                  value={editing ? editing.source || "" : form.source}
                  onChange={(e) => editing ? setEditing({ ...editing, source: e.target.value }) : setForm({ ...form, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="例如：知乎、小红书"
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.isPinned || false}
                    onChange={(e) => setEditing({ ...editing, isPinned: e.target.checked })}
                  />
                  置顶
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={editing ? handleUpdate : handleCreate} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm">
                {editing ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

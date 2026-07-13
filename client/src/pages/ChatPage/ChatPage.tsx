import { useState, useEffect, useRef } from "react";
import { Send, Plus, Trash2, MessageCircle, User, Bot } from "lucide-react";
import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendChatMessage,
} from "../../api";

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    if (activeSessionId) loadMessages(activeSessionId);
  }, [activeSessionId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadSessions() {
    try {
      const data = await getChatSessions();
      setSessions(data || []);
      if (data?.length > 0 && !activeSessionId) setActiveSessionId(data[0].id);
    } catch (e) { console.error(e); }
  }

  async function loadMessages(sessionId: string) {
    try {
      const data = await getChatMessages(sessionId);
      setMessages(data || []);
    } catch (e) { console.error(e); }
  }

  async function handleNewSession() {
    try {
      const session = await createChatSession();
      setSessions([session, ...sessions]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (e) { console.error(e); }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput("");

    // 没有会话时自动创建
    let sessionId = activeSessionId;
    if (!sessionId) {
      const session = await createChatSession();
      setSessions([session, ...sessions]);
      sessionId = session.id;
      setActiveSessionId(sessionId);
    }

    // 乐观更新：添加用户消息
    setMessages((prev) => [...prev, { id: "temp-" + Date.now(), role: "user", content: message }]);
    setLoading(true);

    try {
      const reply = await sendChatMessage(sessionId, message);
      setMessages((prev) => [...prev.filter((m) => !m.id?.startsWith("temp-")), reply]);
      loadSessions(); // 刷新会话列表（更新最后消息）
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev.filter((m) => !m.id?.startsWith("temp-")), { id: "err-" + Date.now(), role: "assistant", content: "抱歉，我暂时无法回复，请稍后再试 😢" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full bg-white">
      {/* 会话列表侧边栏 */}
      <div className={`${sidebarOpen ? "w-60" : "w-0"} border-r border-gray-200 flex-shrink-0 transition-all overflow-hidden`}>
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">对话记录</span>
          <button onClick={handleNewSession} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ height: "calc(100% - 49px)" }}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                s.id === activeSessionId ? "bg-blue-50 text-blue-600" : "text-gray-600"
              }`}
            >
              <p className="truncate font-medium">{s.title}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{s.lastMessage || "新对话"}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 聊天主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <MessageCircle className="w-4 h-4" />
          </button>
          <span className="text-xl">⭐</span>
          <span className="font-bold text-gray-800">胖大星</span>
          <span className="text-xs text-gray-400 ml-auto">你的减肥搭子</span>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-5xl mb-4">⭐</span>
              <p className="text-lg font-medium text-gray-500">嗨，我是胖大星！</p>
              <p className="text-sm mt-2">你的专属减肥管理助手</p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-xs">
                {["今天吃什么比较好？", "怎么控制食欲？", "推荐一个运动计划", "我的体重正常吗？"].map((q) => (
                  <button key={q} onClick={() => { setInput(q); }} className="text-xs px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 transition-colors text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-blue-500" : "bg-yellow-400"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-sm"
                  : "bg-white border border-gray-100 rounded-tl-sm shadow-sm text-gray-700"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="跟胖大星聊聊..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

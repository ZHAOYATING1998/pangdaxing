import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@server/database';
import { chatSessions, chatMessages } from '@server/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import axios from 'axios';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  // ==================== 会话管理 ====================
  async getSessions(userId: string) {
    return this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userProfile, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async createSession(userId: string, title?: string) {
    const [session] = await this.db
      .insert(chatSessions)
      .values({
        title: title || '新对话',
        userProfile: userId,
      })
      .returning();
    return session;
  }

  async deleteSession(id: string, userId: string) {
    await this.db
      .delete(chatMessages)
      .where(eq(chatMessages.sessionId, id));
    return this.db
      .delete(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userProfile, userId)));
  }

  // ==================== 消息管理 ====================
  async getMessages(sessionId: string) {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async sendMessage(data: { sessionId: string; role: string; content: string; userProfile: string }) {
    const [msg] = await this.db.insert(chatMessages).values(data).returning();
    await this.db
      .update(chatSessions)
      .set({ lastMessage: data.content.substring(0, 100), updatedAt: new Date() })
      .where(eq(chatSessions.id, data.sessionId));
    return msg;
  }

  // ==================== AI 聊天 ====================
  async chat(userId: string, sessionId: string, message: string) {
    // 保存用户消息
    await this.sendMessage({
      sessionId,
      role: 'user',
      content: message,
      userProfile: userId,
    });

    // 构建记忆上下文（方案 C：近期 20 条原文 + 更早摘要）
    const ctx = await this.buildMemoryContext(sessionId);

    // 构建 AI 回复
    const aiResponse = await this.generateAIResponse(message, ctx);

    // 保存 AI 回复
    const savedMsg = await this.sendMessage({
      sessionId,
      role: 'assistant',
      content: aiResponse,
      userProfile: userId,
    });

    return savedMsg;
  }

  private async buildMemoryContext(sessionId: string): Promise<{
    history: Array<{ role: string; content: string }>;
    summary: string | null;
  }> {
    const allMessages = await this.getMessages(sessionId);
    const contextMessages = allMessages.slice(0, -1); // 排除刚保存的当前消息
    if (contextMessages.length === 0) return { history: [], summary: null };

    const RECENT = 20;
    const TRIGGER = 30;

    if (contextMessages.length <= TRIGGER) {
      return {
        history: contextMessages.slice(-RECENT).map((m) => ({ role: m.role, content: m.content })),
        summary: null,
      };
    }

    const early = contextMessages.slice(0, contextMessages.length - RECENT);
    const recent = contextMessages.slice(-RECENT);

    const summary = await this.summarizeMessages(early);

    return {
      history: recent.map((m) => ({ role: m.role, content: m.content })),
      summary,
    };
  }

  private async summarizeMessages(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const dialogue = messages
      .map((m) => `${m.role === 'user' ? '用户' : '胖大星'}: ${m.content}`)
      .join('\n');

    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;
    const aiModel = process.env.AI_MODEL || 'deepseek-chat';

    if (!aiApiKey || !aiApiUrl) return dialogue.slice(-500);

    try {
      const { data } = await axios.post(
        aiApiUrl,
        {
          model: aiModel,
          messages: [
            {
              role: 'system',
              content:
                '用 200 字以内的中文摘要下面这段对话历史，提取关键信息：用户目标、体重变化、饮食习惯、运动偏好、重要决定等。只输出摘要。',
            },
            { role: 'user', content: dialogue },
          ],
          max_tokens: 300,
          temperature: 0.3,
        },
        {
          headers: { Authorization: `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        },
      );
      return data.choices?.[0]?.message?.content?.trim() || dialogue.slice(-300);
    } catch {
      return dialogue.slice(-500);
    }
  }

  private async generateAIResponse(
    userMessage: string,
    ctx: { history: Array<{ role: string; content: string }>; summary: string | null },
  ): Promise<string> {
    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;
    const aiModel = process.env.AI_MODEL || 'deepseek-chat';

    this.logger.log(`AI 配置: url=${aiApiUrl}, model=${aiModel}, hasKey=${!!aiApiKey}`);

    if (!aiApiKey || !aiApiUrl) {
      this.logger.warn('AI 未配置，使用预设回复');
      return this.getFallbackResponse(userMessage);
    }

    try {
      // 构建 system prompt（含摘要记忆）
      const systemContent = ctx.summary
        ? '你是"胖大星"，一个友好幽默的减肥管理助手。用中文回答，简洁亲切（2-4句话）。提供科学减肥建议，不推荐极端方法。\n\n以下是你和用户之前的对话记忆摘要，请结合这些记忆回答：\n' + ctx.summary
        : '你是"胖大星"，一个友好幽默的减肥管理助手。用中文回答，简洁亲切（2-4句话）。提供科学减肥建议，不推荐极端方法。';

      const messages: any[] = [{ role: 'system', content: systemContent }];

      // 近期原文
      for (const h of ctx.history) {
        messages.push({ role: h.role, content: h.content });
      }
      // 当前消息
      messages.push({ role: 'user', content: userMessage });

      const { data } = await axios.post(
        aiApiUrl,
        {
          model: aiModel,
          messages,
          max_tokens: 800,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
      throw new Error('AI 返回为空');
    } catch (error: any) {
      const status = error.response?.status;
      const errData = error.response?.data;
      this.logger.error(`AI 调用失败 [${status}]: ${JSON.stringify(errData || error.message)}`);
      return this.getFallbackResponse(userMessage);
    }
  }

  private getFallbackResponse(message: string): string {
    const responses = [
      '这是个好问题！坚持记录是成功减肥的第一步哦~你想了解哪方面的建议呢？',
      '收到！减肥路上我一直在你身边。记得保持好心态，慢慢来会比较快~',
      '有道理！健康的减肥不是一蹴而就的，我们一起制定个小目标吧！',
      '我记住了！每天的小坚持，都会变成未来的大变化。加油！',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

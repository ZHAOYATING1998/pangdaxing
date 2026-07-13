import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { chatSessions, chatMessages } from '@server/database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

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
    // 先删除关联消息
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

    // 更新会话的最后消息
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

    // 获取历史消息作为上下文
    const history = await this.getMessages(sessionId);
    const recentHistory = history.slice(-20); // 最近20条

    // 构建 AI 回复
    const aiResponse = await this.generateAIResponse(message, recentHistory);

    // 保存 AI 回复
    const savedMsg = await this.sendMessage({
      sessionId,
      role: 'assistant',
      content: aiResponse,
      userProfile: userId,
    });

    return savedMsg;
  }

  private async generateAIResponse(message: string, history: any[]): Promise<string> {
    // 构建系统提示词
    const systemPrompt = `你是"胖大星"，一个专业的减肥管理助手。
你的特点：
- 友好、鼓励、幽默但不油滑
- 提供科学的减肥建议，不推荐极端方法
- 关注用户的饮食、运动和心理健康
- 用简洁的方式回答，必要时给出具体建议

当前对话历史：${history.map(m => `${m.role}: ${m.content}`).join('\n')}

用户：${message}

请用中文回答，控制在 3-5 句话以内，风格亲切。`;

    try {
      // 尝试调用 AI API（如果环境变量配置了）
      const aiApiKey = process.env.AI_API_KEY;
      const aiApiUrl = process.env.AI_API_URL;

      if (aiApiKey && aiApiUrl) {
        const axios = require('axios');
        const response = await axios.post(aiApiUrl, {
          model: process.env.AI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }, {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        return response.data.choices[0].message.content;
      }

      // 降级：使用预设回复
      return this.getFallbackResponse(message);
    } catch (error) {
      this.logger.error('AI API 调用失败', error);
      return this.getFallbackResponse(message);
    }
  }

  private getFallbackResponse(message: string): string {
    const responses = [
      '这是个好问题！坚持记录是成功减肥的第一步哦。你想了解哪方面的建议呢？',
      '收到！减肥路上我一直在你身边。记得保持好心态，慢慢来会比较快~',
      '有道理！健康的减肥不是一蹴而就的，我们一起制定个小目标吧？',
      '我记住了！每天的小坚持，都会变成未来的大变化。加油！',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

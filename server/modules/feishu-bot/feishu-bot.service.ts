import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';
import axios from 'axios';
import { ChatService } from '../chat/chat.service';

const RECENT_COUNT = 20; // 最近 20 条原文保留
const SUMMARY_TRIGGER = 30; // 超过 30 条时才生成摘要

@Injectable()
export class FeishuBotService implements OnModuleInit {
  private readonly logger = new Logger(FeishuBotService.name);
  private wsClient: lark.WSClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  // 缓存每个用户的会话 ID，避免每次查库
  private sessionCache: Map<string, string> = new Map();

  constructor(private readonly chatService: ChatService) {}

  onModuleInit() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      this.logger.warn('FEISHU_APP_ID / FEISHU_APP_SECRET 未配置，飞书 Bot 不启动');
      return;
    }

    setTimeout(() => this.startWebSocket(), 3000);
  }

  private async startWebSocket() {
    const appId = process.env.FEISHU_APP_ID!;
    const appSecret = process.env.FEISHU_APP_SECRET!;

    try {
      const eventDispatcher = new lark.EventDispatcher({
        loggerLevel: lark.LoggerLevel.info,
      }).register({
        'im.message.receive_v1': async (data: any) => {
          try {
            await this.handleMessage(data);
          } catch (err) {
            this.logger.error('处理消息时出错', err);
          }
        },
      });

      this.wsClient = new lark.WSClient({
        appId,
        appSecret,
        loggerLevel: lark.LoggerLevel.info,
        autoReconnect: true,
        onReady: () => this.logger.log('飞书 WebSocket 长连接已就绪'),
        onError: (err: Error) => this.logger.error('飞书 WebSocket 错误', err.message),
        onReconnecting: () => this.logger.warn('飞书 WebSocket 正在重连...'),
        onReconnected: () => this.logger.log('飞书 WebSocket 重连成功'),
      });

      await this.wsClient.start({ eventDispatcher });
      this.logger.log('飞书 Bot 长连接已启动');
    } catch (err: any) {
      this.logger.error('启动飞书 WebSocket 失败', err?.message || err);
      setTimeout(() => this.startWebSocket(), 30000);
    }
  }

  // ==================== 消息处理 ====================
  private async handleMessage(data: any) {
    const msgType = data?.message?.message_type;
    const messageId = data?.message?.message_id;
    const chatId = data?.message?.chat_id;
    const chatType = data?.message?.chat_type;
    const senderOpenId = data?.sender?.sender_id?.open_id;

    this.logger.log(`收到消息: type=${msgType}, from=${senderOpenId}`);

    if (msgType !== 'text') {
      await this.replyText(messageId, '我现在只能处理文字消息哦~请发文字给我吧！');
      return;
    }

    let text = '';
    try {
      text = JSON.parse(data.message.content).text || '';
    } catch {
      text = data.message.content || '';
    }

    // 群聊只回复 @胖大星 的消息
    if (chatType === 'group') {
      const mentions = data.message.mentions || [];
      const mentioned = mentions.some((m: any) => m.name === '胖大星' || m.id?.open_id);
      if (!mentioned) return;
      text = text.replace(/@胖大星\s*/g, '').trim();
    }

    if (!text) {
      await this.replyText(messageId, '说点什么吧，我在听呢~');
      return;
    }

    // ---------- 核心：拿到会话 ID，保存消息，构建记忆上下文 ----------
    const sessionId = await this.getOrCreateSession(senderOpenId);

    // 保存用户消息到数据库
    await this.chatService.sendMessage({
      sessionId,
      role: 'user',
      content: text,
      userProfile: senderOpenId,
    });

    // 构建记忆上下文（方案 C：近期 20 条原文 + 更早的摘要）
    const memoryContext = await this.buildMemoryContext(sessionId);

    // 调 AI 生成回复
    const aiReply = await this.callAI(text, memoryContext);
    this.logger.log(`AI 回复 (${senderOpenId}): "${aiReply.substring(0, 80)}"`);

    // 保存 AI 回复到数据库
    await this.chatService.sendMessage({
      sessionId,
      role: 'assistant',
      content: aiReply,
      userProfile: senderOpenId,
    });

    // 回复飞书
    await this.replyText(messageId, aiReply);
  }

  // ==================== 方案 C：记忆上下文构建 ====================
  private async buildMemoryContext(sessionId: string): Promise<{
    history: Array<{ role: string; content: string }>;
    summary: string | null;
  }> {
    const allMessages = await this.chatService.getMessages(sessionId);
    // allMessages 已按时间升序排列
    // 排除最后一条（即当前用户消息，callAI 会单独加）

    const contextMessages = allMessages.slice(0, -1);
    if (contextMessages.length === 0) {
      return { history: [], summary: null };
    }

    if (contextMessages.length <= SUMMARY_TRIGGER) {
      const recent = contextMessages.slice(-RECENT_COUNT);
      return {
        history: recent.map((m) => ({ role: m.role, content: m.content })),
        summary: null,
      };
    }

    // 超过阈值：拆分为「早期」+「近期 20 条」
    const early = contextMessages.slice(0, contextMessages.length - RECENT_COUNT);
    const recent = contextMessages.slice(-RECENT_COUNT);

    // 调用 AI 对早期对话做摘要（用缓存过的摘要字段避免每次重新摘要）
    // 直接用 AI 做一次简短摘要
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

    if (!aiApiKey || !aiApiUrl) {
      // 无 AI 时回退：取最近几条拼接
      return dialogue.slice(-500);
    }

    try {
      const { data } = await axios.post(
        aiApiUrl,
        {
          model: aiModel,
          messages: [
            {
              role: 'system',
              content:
                '用 200 字以内的中文摘要下面这段减肥相关的对话历史，' +
                '提取关键信息：用户目标、体重变化、饮食习惯、运动偏好、重要决定等。只输出摘要。',
            },
            { role: 'user', content: dialogue },
          ],
          max_tokens: 300,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
      return data.choices?.[0]?.message?.content?.trim() || dialogue.slice(-300);
    } catch (err: any) {
      this.logger.warn('摘要生成失败，回退到原始文本截断');
      return dialogue.slice(-500);
    }
  }

  // ==================== AI 调用 ====================
  private async callAI(
    userMessage: string,
    ctx: { history: Array<{ role: string; content: string }>; summary: string | null },
  ): Promise<string> {
    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;
    const aiModel = process.env.AI_MODEL || 'deepseek-chat';

    if (!aiApiKey || !aiApiUrl) {
      return '我现在还没接入 AI 大脑，请稍后再试~';
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(ctx.summary),
        },
      ];

      // 历史消息原文（不包含当前用户消息，下面单独加）
      for (const h of ctx.history) {
        messages.push({ role: h.role, content: h.content });
      }
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
            Authorization: `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
      throw new Error('AI 返回为空');
    } catch (err: any) {
      const status = err.response?.status;
      const errData = err.response?.data;
      this.logger.error(`AI 调用失败 [${status}]: ${JSON.stringify(errData || err.message)}`);
      return '哎呀，我脑子突然短路了，再发一次试试~';
    }
  }

  private buildSystemPrompt(summary: string | null): string {
    const base =
      '你是"胖大星"，一个友好幽默的减肥管理助手。' +
      '用中文回答，简洁亲切（2-4句话）。' +
      '提供科学减肥建议（饮食、运动、心态），不推荐极端节食或减肥药。' +
      '可以开玩笑，但要温暖有力量，像朋友一样鼓励用户。';

    if (!summary) return base;

    return (
      base +
      '\n\n以下是你和用户之前的对话摘要，请结合这些历史记忆来回答当前问题：\n' +
      summary
    );
  }

  // ==================== 会话管理 ====================
  private async getOrCreateSession(userOpenId: string): Promise<string> {
    if (this.sessionCache.has(userOpenId)) {
      return this.sessionCache.get(userOpenId)!;
    }

    const sessions = await this.chatService.getSessions(userOpenId);
    if (sessions.length > 0) {
      const id = sessions[0].id;
      this.sessionCache.set(userOpenId, id);
      return id;
    }

    const session = await this.chatService.createSession(userOpenId, '飞书对话');
    this.sessionCache.set(userOpenId, session.id);
    return session.id;
  }

  // ==================== 发送飞书消息 ====================
  private async replyText(messageId: string, text: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      await axios.post(
        'https://open.feishu.cn/open-apis/im/v1/messages/' + messageId + '/reply',
        {
          content: JSON.stringify({ text }),
          msg_type: 'text',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
    } catch (err: any) {
      this.logger.error(`回复消息失败 [${err.response?.status}]`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const { data } = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
    );

    this.accessToken = data.tenant_access_token;
    this.tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
    return this.accessToken!;
  }
}

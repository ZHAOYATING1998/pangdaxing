import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';
import axios from 'axios';
import { ChatService } from '../chat/chat.service';

const RECENT_COUNT = 20; // 最近 20 条原文保留
const SUMMARY_TRIGGER = 30; // 超过 30 条时才生成摘要
const HEALTH_CHECK_INTERVAL = 30000; // 30秒心跳检测
const MAX_RECONNECT_ATTEMPTS = 10; // 最大重连次数

@Injectable()
export class FeishuBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeishuBotService.name);
  private wsClient: lark.WSClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  // 缓存每个用户的会话 ID，避免每次查库
  private sessionCache: Map<string, string> = new Map();
  private connected = false;
  private lastConnectedAt: string | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isDestroyed = false;

  constructor(private readonly chatService: ChatService) {}

  onModuleInit() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      console.warn('[FEISHU BOT] FEISHU_APP_ID / FEISHU_APP_SECRET 未配置，飞书 Bot 不启动');
      this.logger.warn('FEISHU_APP_ID / FEISHU_APP_SECRET 未配置，飞书 Bot 不启动');
      return;
    }

    console.log('[FEISHU BOT] 模块初始化，3秒后启动 WebSocket...');
    this.logger.log('飞书 Bot 模块初始化，3秒后启动 WebSocket...');
    setTimeout(() => this.startWebSocket(), 3000);
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.wsClient) {
      this.logger.log('正在关闭飞书 WebSocket 连接...');
      this.wsClient.close({ force: true });
      this.wsClient = null;
    }
  }

  private async startWebSocket() {
    if (this.isDestroyed) return;

    const appId = process.env.FEISHU_APP_ID!;
    const appSecret = process.env.FEISHU_APP_SECRET!;

    this.reconnectAttempts++;
    console.log(`[FEISHU BOT] 启动 WebSocket (尝试 #${this.reconnectAttempts})...`);
    this.logger.log(`启动飞书 WebSocket (尝试 #${this.reconnectAttempts})...`);

    try {
      const eventDispatcher = new lark.EventDispatcher({
        loggerLevel: lark.LoggerLevel.info,
      }).register({
        'im.message.receive_v1': async (data: any) => {
          try {
            await this.handleMessage(data);
          } catch (err) {
            console.error('[FEISHU BOT] 处理消息时出错:', err);
            this.logger.error('处理消息时出错', err);
          }
        },
      });

      this.wsClient = new lark.WSClient({
        appId,
        appSecret,
        loggerLevel: lark.LoggerLevel.info,
        autoReconnect: true,
        onReady: () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.lastConnectedAt = new Date().toISOString();
          console.log('[FEISHU BOT] WebSocket 长连接已就绪');
          this.logger.log('飞书 WebSocket 长连接已就绪');
        },
        onError: (err: Error) => {
          this.connected = false;
          console.error('[FEISHU BOT] WebSocket 错误:', err.message);
          this.logger.error('飞书 WebSocket 错误', err.message);
        },
        onReconnecting: () => {
          this.connected = false;
          console.warn('[FEISHU BOT] WebSocket 正在重连...');
          this.logger.warn('飞书 WebSocket 正在重连...');
        },
        onReconnected: () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.lastConnectedAt = new Date().toISOString();
          console.log('[FEISHU BOT] WebSocket 重连成功');
          this.logger.log('飞书 WebSocket 重连成功');
        },
      });

      await this.wsClient.start({ eventDispatcher });
      console.log('[FEISHU BOT] 长连接已启动');
      this.logger.log('飞书 Bot 长连接已启动');
      this.startHealthCheck();
    } catch (err: any) {
      console.error('[FEISHU BOT] 启动 WebSocket 失败:', err?.message || err);
      this.logger.error('启动飞书 WebSocket 失败', err?.message || err);
      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(this.reconnectAttempts * 5000, 60000);
        console.log(`[FEISHU BOT] ${delay / 1000}秒后尝试重连...`);
        this.logger.log(`${delay / 1000}秒后尝试重连...`);
        setTimeout(() => this.startWebSocket(), delay);
      } else {
        console.error('[FEISHU BOT] 达到最大重连次数，停止自动重连');
        this.logger.error('达到最大重连次数，停止自动重连');
      }
    }
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = setInterval(() => {
      if (!this.isDestroyed && !this.connected) {
        this.logger.warn('心跳检测发现连接断开，尝试重新启动...');
        this.startWebSocket();
      }
    }, HEALTH_CHECK_INTERVAL);
    this.logger.log('心跳检测已启动 (每30秒)');
  }

  // ==================== 消息处理 ====================
  private async handleMessage(data: any) {
    const msgType = data?.message?.message_type;
    const messageId = data?.message?.message_id;
    const chatType = data?.message?.chat_type;
    const senderOpenId = data?.sender?.sender_id?.open_id;

    console.log(`[FEISHU BOT] 收到消息: type=${msgType}, from=${senderOpenId}, chatType=${chatType}`);
    this.logger.log(`收到消息: type=${msgType}, from=${senderOpenId}, chatType=${chatType}, msgId=${messageId?.substring(0, 20)}...`);

    if (!senderOpenId) {
      this.logger.warn('消息缺少 sender open_id，忽略');
      return;
    }

    if (msgType !== 'text') {
      this.logger.log(`非文本消息，回复提示: ${msgType}`);
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
      if (!mentioned) {
        this.logger.log('群聊中未被@，忽略消息');
        return;
      }
      text = text.replace(/@胖大星\s*/g, '').trim();
    }

    if (!text) {
      this.logger.log('空文本消息，回复提示');
      await this.replyText(messageId, '说点什么吧，我在听呢~');
      return;
    }

    this.logger.log(`处理用户消息: "${text.substring(0, 50)}..."`);

    try {
      // ---------- 拿到会话 ID，保存消息，构建记忆上下文 ----------
      console.log('[FEISHU BOT] 处理用户消息:', text.slice(0, 50));
      const sessionId = await this.getOrCreateSession(senderOpenId);
      console.log('[FEISHU BOT] 会话 ID:', sessionId.slice(0, 16));

      // 保存用户消息到数据库
      await this.chatService.sendMessage({
        sessionId,
        role: 'user',
        content: text,
        userProfile: senderOpenId,
      });
      console.log('[FEISHU BOT] 用户消息已保存');

      // 构建记忆上下文（方案 C：近期 20 条原文 + 更早的摘要）
      const memoryContext = await this.buildMemoryContext(sessionId);
      console.log(`[FEISHU BOT] 记忆上下文: history=${memoryContext.history.length}, summary=${memoryContext.summary ? '有' : '无'}`);

      // 调 AI 生成回复
      console.log('[FEISHU BOT] 开始调用 AI...');
      const aiReply = await this.callAI(text, memoryContext);
      console.log(`[FEISHU BOT] AI 回复: "${aiReply.substring(0, 80)}..."`);

      // 保存 AI 回复到数据库
      await this.chatService.sendMessage({
        sessionId,
        role: 'assistant',
        content: aiReply,
        userProfile: senderOpenId,
      });
      console.log('[FEISHU BOT] AI 回复已保存');

      // 回复飞书
      console.log('[FEISHU BOT] 发送飞书回复...');
      await this.replyText(messageId, aiReply);
      console.log('[FEISHU BOT] 飞书回复发送成功');
    } catch (err: any) {
      console.error('[FEISHU BOT] 消息处理失败:', err?.message || err);
      this.logger.error(`消息处理失败: ${err?.message || err}`);
      // 尝试发送错误提示
      try {
        await this.replyText(messageId, '哎呀，我脑子突然短路了，再发一次试试~');
      } catch (replyErr) {
        console.error('[FEISHU BOT] 发送错误提示也失败了:', replyErr);
        this.logger.error('发送错误提示也失败了', replyErr);
      }
    }
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

  // ==================== 状态查询 ====================
  getStatus() {
    return {
      connected: this.connected,
      lastConnectedAt: this.lastConnectedAt,
      reconnectAttempts: this.reconnectAttempts,
      wsClientExists: !!this.wsClient,
      healthCheckActive: !!this.healthCheckTimer,
      timestamp: new Date().toISOString(),
    };
  }
}

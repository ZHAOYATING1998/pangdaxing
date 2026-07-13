import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';
import axios from 'axios';

@Injectable()
export class FeishuBotService implements OnModuleInit {
  private readonly logger = new Logger(FeishuBotService.name);
  private wsClient: lark.WSClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  onModuleInit() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      this.logger.warn('FEISHU_APP_ID / FEISHU_APP_SECRET 未配置，飞书 Bot 不启动');
      return;
    }

    // 延迟 3 秒启动，等数据库等其他依赖就绪
    setTimeout(() => this.startWebSocket(), 3000);
  }

  private async startWebSocket() {
    const appId = process.env.FEISHU_APP_ID!;
    const appSecret = process.env.FEISHU_APP_SECRET!;

    try {
      // 创建事件分发器，注册消息接收事件
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

      // 创建 WebSocket 客户端
      this.wsClient = new lark.WSClient({
        appId,
        appSecret,
        loggerLevel: lark.LoggerLevel.info,
        autoReconnect: true,
        onReady: () => {
          this.logger.log('飞书 WebSocket 长连接已就绪');
        },
        onError: (err: Error) => {
          this.logger.error('飞书 WebSocket 错误', err.message);
        },
        onReconnecting: () => {
          this.logger.warn('飞书 WebSocket 正在重连...');
        },
        onReconnected: () => {
          this.logger.log('飞书 WebSocket 重连成功');
        },
      });

      // 启动长连接
      await this.wsClient.start({ eventDispatcher });
      this.logger.log('飞书 Bot 长连接已启动');
    } catch (err: any) {
      this.logger.error('启动飞书 WebSocket 失败', err?.message || err);
      // 30 秒后重试
      setTimeout(() => this.startWebSocket(), 30000);
    }
  }

  // ==================== 处理收到的消息 ====================
  private async handleMessage(data: any) {
    const msgType = data?.message?.message_type;
    const messageId = data?.message?.message_id;
    const senderOpenId = data?.sender?.sender_id?.open_id;
    const chatId = data?.message?.chat_id;
    const chatType = data?.message?.chat_type; // p2p 或 group

    this.logger.log(`收到消息: type=${msgType}, chatType=${chatType}, from=${senderOpenId}`);

    // 只处理文本消息
    if (msgType !== 'text') {
      await this.replyText(messageId, '我现在只能处理文字消息哦~ 请发文字给我吧！');
      return;
    }

    // 解析消息内容
    let text = '';
    try {
      const content = JSON.parse(data.message.content);
      text = content.text || '';
    } catch {
      text = data.message.content || '';
    }

    // 群聊里只有 @机器人 才回复
    if (chatType === 'group') {
      const mentions = data.message.mentions || [];
      const botMentioned = mentions.some((m: any) => m.name === '胖大星' || m.id?.open_id);
      if (!botMentioned) return;
      // 去掉 @机器人 的部分
      text = text.replace(/@胖大星\s*/g, '').trim();
    }

    if (!text) {
      await this.replyText(messageId, '说点什么吧，我在听呢~');
      return;
    }

    // 调用 AI 生成回复
    this.logger.log(`开始调 AI: "${text.substring(0, 50)}"`);
    const aiReply = await this.generateAIResponse(text, senderOpenId);
    this.logger.log(`AI 回复: "${aiReply.substring(0, 80)}"`);

    // 发送回复
    await this.replyText(messageId, aiReply);
  }

  // ==================== AI 回复 ====================
  private async generateAIResponse(userMessage: string, userOpenId: string): Promise<string> {
    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;
    const aiModel = process.env.AI_MODEL || 'deepseek-chat';

    if (!aiApiKey || !aiApiUrl) {
      this.logger.warn('AI 未配置，使用预设回复');
      return '我现在还没接入 AI 大脑，请稍后再试~';
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content:
            '你是"胖大星"，一个友好幽默的减肥管理助手。' +
            '用中文回答，简洁亲切（2-4句话）。' +
            '提供科学减肥建议（饮食、运动、心态），不推荐极端节食或减肥药。' +
            '可以开玩笑，但要温暖有力量，像朋友一样鼓励用户。',
        },
        { role: 'user', content: userMessage },
      ];

      const { data } = await axios.post(
        aiApiUrl,
        {
          model: aiModel,
          messages,
          max_tokens: 600,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );

      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
      throw new Error('AI 返回为空');
    } catch (err: any) {
      const status = err.response?.status;
      const errData = err.response?.data;
      this.logger.error(
        `AI 调用失败 [${status}]: ${JSON.stringify(errData || err.message)}`,
      );
      return '哎呀，我脑子突然短路了，再发一次试试~';
    }
  }

  // ==================== 发送消息 ====================
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
      this.logger.log(`回复消息成功: "${text.substring(0, 50)}"`);
    } catch (err: any) {
      const status = err.response?.status;
      const errData = err.response?.data;
      this.logger.error(`回复消息失败 [${status}]: ${JSON.stringify(errData || err.message)}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    const { data } = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      { app_id: appId, app_secret: appSecret },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
    );

    this.accessToken = data.tenant_access_token;
    this.tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
    return this.accessToken!;
  }
}

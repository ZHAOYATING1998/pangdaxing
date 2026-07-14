import { Controller, Post, Body, Logger } from '@nestjs/common';
import axios from 'axios';
import { FeishuService } from '@server/common/feishu.service';

@Controller('webhook/feishu')
export class FeishuCallbackController {
  private readonly logger = new Logger(FeishuCallbackController.name);
  // 存储每个用户的最近聊天历史
  private chatHistory: Map<string, { role: string; content: string }[]> = new Map();

  constructor(private readonly feishuService: FeishuService) {}

  @Post('callback')
  async callback(@Body() body: any) {
    console.log('[FEISHU CALLBACK] received body:', JSON.stringify(body).slice(0, 500));

    // URL 验证：飞书配置回调地址时会发 challenge
    if (body?.type === 'url_verification') {
      const challenge = body?.challenge || body?.token;
      console.log('[FEISHU CALLBACK] URL verification challenge:', challenge);
      return { challenge };
    }

    // 事件回调
    if (body?.header?.event_type === 'im.message.receive_v1') {
      const event = body?.event;
      const message = event?.message;
      
      // 只处理文本消息、且不是机器人自己发的
      if (message?.message_type === 'text' && event?.sender?.sender_id?.open_id) {
        const senderId = event.sender.sender_id.open_id;
        const content = JSON.parse(message.content || '{}').text || '';
        console.log(`[FEISHU CALLBACK] msg from ${senderId}: ${content.slice(0, 100)}`);

        // 异步回复，不阻塞回调响应
        this.replyWithAI(senderId, content).catch((err) =>
          console.error('[FEISHU CALLBACK] AI reply failed:', err),
        );
      }
    }

    // 飞书要求 1 秒内返回 200
    return { code: 0 };
  }

  private async replyWithAI(openId: string, userMessage: string) {
    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;
    const aiModel = process.env.AI_MODEL || 'deepseek-chat';

    if (!aiApiKey || !aiApiUrl) {
      await this.feishuService.sendMessage(openId, '抱歉，AI 服务还没配置好，请稍后再试~');
      return;
    }

    // 获取该用户的历史（最近10条）
    let history = this.chatHistory.get(openId) || [];

    // 构建 messages
    const messages: any[] = [
      {
        role: 'system',
        content: '你是"胖大星"⭐，一个友好幽默的减肥管理助手。用中文回答，简洁亲切（2-4句话）。提供科学减肥建议，不推荐极端方法。',
      },
      ...history.slice(-10),
    ];

    try {
      console.log('[FEISHU CALLBACK] Calling AI for:', userMessage.slice(0, 50));
      const { data } = await axios.post(
        aiApiUrl,
        {
          model: aiModel,
          messages: [...messages, { role: 'user', content: userMessage }],
          max_tokens: 600,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const reply = data.choices?.[0]?.message?.content || '嗯嗯，这个问题我需要想想~';
      console.log('[FEISHU CALLBACK] AI reply:', reply.slice(0, 100));

      // 保存历史
      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: reply });
      if (history.length > 20) history = history.slice(-20); // 保留最近20条
      this.chatHistory.set(openId, history);

      // 发送回复
      await this.feishuService.sendMessage(openId, reply);
      console.log(`[FEISHU CALLBACK] Reply sent to ${openId}`);
    } catch (error: any) {
      console.error('[FEISHU CALLBACK] AI call failed:', error.message);
      await this.feishuService.sendMessage(
        openId,
        '哎呀，我脑子卡了一下😵 再说一遍试试？',
      );
    }
  }
}

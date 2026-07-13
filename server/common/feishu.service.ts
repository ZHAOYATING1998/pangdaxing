import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FeishuService {
  private readonly logger = new Logger(FeishuService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      this.logger.error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置');
      throw new Error('飞书应用凭证未配置');
    }

    try {
      const { data } = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        { app_id: appId, app_secret: appSecret },
        { headers: { 'Content-Type': 'application/json' } },
      );

      this.accessToken = data.tenant_access_token;
      this.tokenExpiresAt = Date.now() + (data.expire - 300) * 1000; // 提前5分钟刷新
      return this.accessToken!;
    } catch (error) {
      this.logger.error('获取飞书 access_token 失败', error);
      throw error;
    }
  }

  async sendMessage(openId: string, content: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      await axios.post(
        'https://open.feishu.cn/open-apis/im/v1/messages',
        {
          receive_id: openId,
          msg_type: 'text',
          content: JSON.stringify({ text: content }),
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: { receive_id_type: 'open_id' },
        },
      );
      this.logger.log(`消息已发送给 ${openId}`);
      return true;
    } catch (error) {
      this.logger.error('发送飞书消息失败', error);
      return false;
    }
  }
}

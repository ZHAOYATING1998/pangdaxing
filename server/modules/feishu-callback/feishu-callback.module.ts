import { Module } from '@nestjs/common';
import { FeishuCallbackController } from './feishu-callback.controller';
import { FeishuService } from '@server/common/feishu.service';

@Module({
  controllers: [FeishuCallbackController],
  providers: [FeishuService],
})
export class FeishuCallbackModule {}

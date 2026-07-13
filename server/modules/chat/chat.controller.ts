import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.chatService.getSessions(req.user.user_id);
  }

  @Post('sessions')
  async createSession(@Req() req: any, @Body() body: any) {
    return this.chatService.createSession(req.user.user_id, body?.title);
  }

  @Delete('sessions/:id')
  async deleteSession(@Req() req: any, @Param('id') id: string) {
    return this.chatService.deleteSession(id, req.user.user_id);
  }

  @Get('sessions/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getMessages(sessionId);
  }

  @Post('send')
  async sendMessage(@Req() req: any, @Body() body: { sessionId: string; message: string }) {
    return this.chatService.chat(req.user.user_id, body.sessionId, body.message);
  }
}

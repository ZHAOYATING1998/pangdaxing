import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  async getSessions(@Req() req: any) {
    const userId = req.user?.user_id || 'unknown';
    return this.chatService.getSessions(userId);
  }

  @Post('sessions')
  async createSession(@Req() req: any, @Body() body: any) {
    const userId = req.user?.user_id || 'unknown';
    return this.chatService.createSession(userId, body?.title);
  }

  @Delete('sessions/:id')
  async deleteSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.user_id || 'unknown';
    return this.chatService.deleteSession(id, userId);
  }

  @Get('sessions/:sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getMessages(sessionId);
  }

  @Post('send')
  async sendMessage(@Req() req: any, @Body() body: { sessionId: string; message: string }) {
    const userId = req.user?.user_id || 'unknown';
    return this.chatService.chat(userId, body.sessionId, body.message);
  }
}

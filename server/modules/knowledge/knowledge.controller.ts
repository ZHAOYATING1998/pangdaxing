import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  async getDocs(@Req() req: any, @Query('category') category?: string, @Query('keyword') keyword?: string) {
    return this.knowledgeService.getDocs(req.user.user_id, category, keyword);
  }

  @Get('categories')
  async getCategories(@Req() req: any) {
    return this.knowledgeService.getCategories(req.user.user_id);
  }

  @Get(':id')
  async getDoc(@Req() req: any, @Param('id') id: string) {
    return this.knowledgeService.getDoc(id, req.user.user_id);
  }

  @Post()
  async createDoc(@Req() req: any, @Body() body: any) {
    return this.knowledgeService.createDoc({
      ...body,
      userProfile: req.user.user_id,
    });
  }

  @Put(':id')
  async updateDoc(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.knowledgeService.updateDoc(id, req.user.user_id, body);
  }

  @Delete(':id')
  async deleteDoc(@Req() req: any, @Param('id') id: string) {
    return this.knowledgeService.deleteDoc(id, req.user.user_id);
  }
}

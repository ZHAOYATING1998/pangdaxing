import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // 获取看板统计
  @Get('stats')
  async getStats(@Req() req: any) {
    return this.healthService.getStats(req.user?.user_id || 'unknown');
  }

  // ==================== 体重 ====================
  @Get('weight')
  async getWeightRecords(@Req() req: any, @Query('days') days?: number) {
    return this.healthService.getWeightRecords(req.user?.user_id || 'unknown', days || 30);
  }

  @Post('weight')
  async addWeightRecord(@Req() req: any, @Body() body: any) {
    return this.healthService.addWeightRecord({
      ...body,
      userProfile: req.user?.user_id || 'unknown',
    });
  }

  @Delete('weight/:id')
  async deleteWeightRecord(@Req() req: any, @Param('id') id: string) {
    return this.healthService.deleteWeightRecord(id, req.user?.user_id || 'unknown');
  }

  // ==================== 饮食 ====================
  @Get('diet')
  async getDietRecords(@Req() req: any, @Query('date') date?: string) {
    return this.healthService.getDietRecords(req.user?.user_id || 'unknown', date);
  }

  @Post('diet')
  async addDietRecord(@Req() req: any, @Body() body: any) {
    return this.healthService.addDietRecord({
      ...body,
      userProfile: req.user?.user_id || 'unknown',
    });
  }

  @Delete('diet/:id')
  async deleteDietRecord(@Req() req: any, @Param('id') id: string) {
    return this.healthService.deleteDietRecord(id, req.user?.user_id || 'unknown');
  }

  // ==================== 运动 ====================
  @Get('exercise')
  async getExerciseRecords(@Req() req: any, @Query('days') days?: number) {
    return this.healthService.getExerciseRecords(req.user?.user_id || 'unknown', days || 30);
  }

  @Post('exercise')
  async addExerciseRecord(@Req() req: any, @Body() body: any) {
    return this.healthService.addExerciseRecord({
      ...body,
      userProfile: req.user?.user_id || 'unknown',
    });
  }

  @Delete('exercise/:id')
  async deleteExerciseRecord(@Req() req: any, @Param('id') id: string) {
    return this.healthService.deleteExerciseRecord(id, req.user?.user_id || 'unknown');
  }

  // ==================== 目标 ====================
  @Get('goals')
  async getGoals(@Req() req: any) {
    return this.healthService.getGoals(req.user?.user_id || 'unknown');
  }

  @Post('goals')
  async setGoal(@Req() req: any, @Body() body: any) {
    return this.healthService.setGoal({
      ...body,
      userProfile: req.user?.user_id || 'unknown',
    });
  }

  @Post('goals/:id')
  async updateGoal(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.healthService.updateGoal(id, req.user?.user_id || 'unknown', body);
  }
}

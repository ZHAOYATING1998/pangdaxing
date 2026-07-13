import { Controller, Get, Post, Delete, Put, Body, Param, Req } from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('api/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async getTasks(@Req() req: any) {
    return this.taskService.getTasks(req.user.user_id);
  }

  @Post()
  async createTask(@Req() req: any, @Body() body: any) {
    return this.taskService.createTask({
      ...body,
      userProfile: req.user.user_id,
    });
  }

  @Put(':id')
  async updateTask(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.taskService.updateTask(id, req.user.user_id, body);
  }

  @Delete(':id')
  async deleteTask(@Req() req: any, @Param('id') id: string) {
    return this.taskService.deleteTask(id, req.user.user_id);
  }

  @Get('completions')
  async getTodayCompletions(@Req() req: any) {
    return this.taskService.getTodayCompletions(req.user.user_id);
  }

  @Post(':taskId/complete')
  async completeTask(@Req() req: any, @Param('taskId') taskId: string, @Body() body: any) {
    return this.taskService.completeTask({
      taskId,
      completedDate: new Date(),
      notes: body?.notes,
      userProfile: req.user.user_id,
    });
  }

  @Delete(':taskId/complete')
  async uncompleteTask(@Req() req: any, @Param('taskId') taskId: string) {
    return this.taskService.uncompleteTask(taskId, req.user.user_id);
  }

  @Get('stats/weekly')
  async getWeeklyStats(@Req() req: any) {
    return this.taskService.getWeeklyStats(req.user.user_id);
  }
}

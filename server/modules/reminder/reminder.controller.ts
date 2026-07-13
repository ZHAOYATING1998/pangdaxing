import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { ReminderService } from './reminder.service';

@Controller('api/reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  async getReminders(@Req() req: any) {
    return this.reminderService.getReminders(req.user.user_id);
  }

  @Post()
  async createReminder(@Req() req: any, @Body() body: any) {
    return this.reminderService.createReminder({
      ...body,
      userProfile: req.user.user_id,
    });
  }

  @Put(':id')
  async updateReminder(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.reminderService.updateReminder(id, req.user.user_id, body);
  }

  @Delete(':id')
  async deleteReminder(@Req() req: any, @Param('id') id: string) {
    return this.reminderService.deleteReminder(id, req.user.user_id);
  }
}

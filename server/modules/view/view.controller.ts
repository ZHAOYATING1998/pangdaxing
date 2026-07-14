import { Controller, Get, Req } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class ViewController {

  @Get(['/'])
  index(@Req() req: any, res: Response) {
    // Fly.io 版本：简化，不使用平台数据
    return 'OK';
  }
}

import { Controller, Get } from '@nestjs/common';

@Controller('api/hello')
export class HelloController {
  @Get()
  health() {
    return {
      status: 'ok',
      app: '胖大星',
      timestamp: Date.now(),
    };
  }
}

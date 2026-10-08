import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id || req.user.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { success: true, message: 'Logged out successfully' };
  }
}
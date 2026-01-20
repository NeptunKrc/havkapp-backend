import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.validateLogin(dto.studentNo, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
  //TEST AMACLI KULLANMA ALOOOO BURASI SİLİNECEK EVET ANY VAR BİLİYORUM ZATEN KULLANILMAYACAK
  @UseGuards(JwtAuthGuard)
  @Get('check')
  check(@Req() req: any) {
    return {
      authenticated: true,
      userId: req.user.sub,
      clubId: req.user.clubId,
    };
  }
}

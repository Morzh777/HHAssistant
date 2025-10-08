import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  SaveCookiesRequest,
  SaveCookiesResponse,
  ResetResumeResponse,
} from '../types/auth.types';

@Controller('auth/hh')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('cookies')
  @HttpCode(HttpStatus.OK)
  async saveCookies(
    @Body() body: SaveCookiesRequest,
  ): Promise<SaveCookiesResponse> {
    return this.authService.saveCookies(body.cookie);
  }

  @Post('reset-resume')
  @HttpCode(HttpStatus.OK)
  async resetResume(): Promise<ResetResumeResponse> {
    return this.authService.resetResume();
  }
}

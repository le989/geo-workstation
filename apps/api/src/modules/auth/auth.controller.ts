import { Body, Controller, Get, Inject, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentSession } from "./current-session.decorator";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";
import type { AuthSession } from "./auth.types";

@Controller("api/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get("me")
  me(@CurrentSession() session: AuthSession | undefined) {
    if (!session) {
      throw new UnauthorizedException("请先登录");
    }

    return session;
  }

  @Post("logout")
  logout() {
    return {
      loggedOut: true
    };
  }
}

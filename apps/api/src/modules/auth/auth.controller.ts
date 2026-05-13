import { Body, Controller, Get, Inject, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";
import type { AuthUser } from "./auth.types";

@Controller("api/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser | undefined) {
    if (!user) {
      throw new UnauthorizedException("请先登录");
    }

    return user;
  }

  @Post("logout")
  logout() {
    return {
      loggedOut: true
    };
  }
}

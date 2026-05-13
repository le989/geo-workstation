import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserStatus, type User } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "./auth.types";
import { JwtTokenService } from "./jwt-token.service";
import { verifyPassword } from "./utils/password-hash.util";

type LoginResult = {
  token: string;
  user: AuthUser;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtTokenService)
    private readonly jwtTokenService: JwtTokenService
  ) {}

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email
      }
    });

    if (
      !user ||
      user.status !== UserStatus.active ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("账号或密码错误");
    }

    const safeUser = this.toAuthUser(user);

    return {
      token: this.jwtTokenService.signUser(safeUser),
      user: safeUser
    };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException("登录状态无效或已过期");
    }

    return this.toAuthUser(user);
  }

  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };
  }
}

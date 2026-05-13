import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { AuthUser, JwtUserPayload } from "./auth.types";

@Injectable()
export class JwtTokenService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  signUser(user: AuthUser): string {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const expiresIn = (this.configService.get<string>("JWT_EXPIRES_IN") ??
      "12h") as SignOptions["expiresIn"];

    return jwt.sign(payload, this.getJwtSecret(), { expiresIn });
  }

  verifyToken(token: string): JwtUserPayload {
    try {
      const payload = jwt.verify(token, this.getJwtSecret());

      if (!this.isJwtUserPayload(payload)) {
        throw new UnauthorizedException("登录状态无效或已过期");
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("登录状态无效或已过期");
    }
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>("JWT_SECRET");

    if (!secret) {
      throw new Error("JWT_SECRET is required.");
    }

    return secret;
  }

  private isJwtUserPayload(payload: string | JwtPayload): payload is JwtUserPayload {
    return (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    );
  }
}

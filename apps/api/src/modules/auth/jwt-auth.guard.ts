import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { IS_PUBLIC_ROUTE } from "./public.decorator";
import type { AuthenticatedRequest } from "./auth.types";
import { AuthService } from "./auth.service";
import { JwtTokenService } from "./jwt-token.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(JwtTokenService)
    private readonly jwtTokenService: JwtTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic || this.shouldBypassForTests()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.method === "OPTIONS") {
      return true;
    }

    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("请先登录");
    }

    const payload = this.jwtTokenService.verifyToken(token);
    request.user = await this.authService.getCurrentUser(payload.sub);

    return true;
  }

  private shouldBypassForTests(): boolean {
    return this.configService.get<string>("BYPASS_AUTH_FOR_TESTS") === "true";
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!value) {
      return null;
    }

    const [type, token] = value.split(" ");

    if (type?.toLowerCase() !== "bearer" || !token) {
      return null;
    }

    return token;
  }
}

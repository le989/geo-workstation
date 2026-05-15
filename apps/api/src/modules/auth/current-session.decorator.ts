import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, AuthSession } from "./auth.types";

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSession | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.authSession;
  }
);

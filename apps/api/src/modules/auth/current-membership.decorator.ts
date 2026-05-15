import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, CurrentMembershipContext } from "./auth.types";

export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentMembershipContext | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.currentMembership;
  }
);

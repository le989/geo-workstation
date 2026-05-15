import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, AuthCompanyOption } from "./auth.types";

export const CurrentCompany = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthCompanyOption | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.currentCompany;
  }
);

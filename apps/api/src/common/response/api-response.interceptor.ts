import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor
} from "@nestjs/common";
import { map, type Observable } from "rxjs";
import { createApiResponse, isApiResponse, type ApiResponse } from "./api-response";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (isApiResponse(payload)) {
          return payload;
        }

        return createApiResponse(payload ?? null);
      })
    );
  }
}

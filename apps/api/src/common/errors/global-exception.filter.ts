import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter
} from "@nestjs/common";
import { createApiResponse, type ApiResponse } from "../response/api-response";

type ErrorPayload = {
  errors?: string[];
} | null;

type HttpResponse = {
  status: (statusCode: number) => {
    json: (body: ApiResponse<ErrorPayload>) => void;
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponse>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, data } = this.normalizeException(exception);
    const body: ApiResponse<ErrorPayload> = createApiResponse(data, message, status);

    response.status(status).json(body);
  }

  private normalizeException(exception: unknown): { message: string; data: ErrorPayload } {
    if (!(exception instanceof HttpException)) {
      return {
        message: "Internal server error",
        data: null
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === "string") {
      return {
        message: exceptionResponse,
        data: null
      };
    }

    if (this.isRecord(exceptionResponse)) {
      const responseMessage = exceptionResponse.message;

      if (Array.isArray(responseMessage)) {
        return {
          message: "Validation failed",
          data: {
            errors: responseMessage.map(String)
          }
        };
      }

      if (typeof responseMessage === "string") {
        return {
          message: responseMessage,
          data: null
        };
      }

      if (typeof exceptionResponse.error === "string") {
        return {
          message: exceptionResponse.error,
          data: null
        };
      }
    }

    return {
      message: exception.message,
      data: null
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}

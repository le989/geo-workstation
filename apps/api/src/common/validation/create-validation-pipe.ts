import { ValidationPipe, type Type, type ValidationPipeOptions } from "@nestjs/common";

export function createValidationPipe(expectedType?: Type<unknown>): ValidationPipe {
  const options: ValidationPipeOptions = {
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: {
      target: false,
      value: false
    },
    transformOptions: {
      enableImplicitConversion: true
    }
  };

  if (expectedType) {
    options.expectedType = expectedType;
  }

  return new ValidationPipe(options);
}

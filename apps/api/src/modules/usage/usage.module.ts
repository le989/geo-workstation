import { Global, Module } from "@nestjs/common";
import { AiCallLogsService } from "./ai-call-logs.service";
import { AiUsageService } from "./ai-usage.service";
import { OperationLogsController } from "./operation-logs.controller";
import { OperationLogsService } from "./operation-logs.service";
import { UsageController } from "./usage.controller";

@Global()
@Module({
  controllers: [UsageController, OperationLogsController],
  providers: [AiCallLogsService, AiUsageService, OperationLogsService],
  exports: [AiCallLogsService, AiUsageService, OperationLogsService]
})
export class UsageModule {}

import { Global, Module } from "@nestjs/common";
import { AiUsageService } from "./ai-usage.service";
import { OperationLogsController } from "./operation-logs.controller";
import { OperationLogsService } from "./operation-logs.service";
import { UsageController } from "./usage.controller";

@Global()
@Module({
  controllers: [UsageController, OperationLogsController],
  providers: [AiUsageService, OperationLogsService],
  exports: [AiUsageService, OperationLogsService]
})
export class UsageModule {}

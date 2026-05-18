import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CompaniesController } from "./companies.controller";
import { ProductLinesController } from "./product-lines.controller";
import { SettingsManagementService } from "./settings-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController, ProductLinesController],
  providers: [SettingsManagementService]
})
export class SettingsManagementModule {}

import { Module } from "@nestjs/common";
import { InstructionTemplatesController } from "./instruction-templates.controller";
import { InstructionTemplatesService } from "./instruction-templates.service";

@Module({
  controllers: [InstructionTemplatesController],
  providers: [InstructionTemplatesService],
  exports: [InstructionTemplatesService]
})
export class GeoInstructionsModule {}

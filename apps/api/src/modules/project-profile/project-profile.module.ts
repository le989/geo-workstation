import { Module } from "@nestjs/common";
import { ProjectProfileController } from "./project-profile.controller";
import { ProjectProfileService } from "./project-profile.service";

@Module({
  controllers: [ProjectProfileController],
  providers: [ProjectProfileService],
  exports: [ProjectProfileService]
})
export class ProjectProfileModule {}

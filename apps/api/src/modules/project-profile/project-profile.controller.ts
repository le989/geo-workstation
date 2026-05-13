import { Body, Controller, Get, Inject, Patch, Post } from "@nestjs/common";
import { CreateProjectProfileDto } from "./dto/create-project-profile.dto";
import { UpdateProjectProfileDto } from "./dto/update-project-profile.dto";
import { ProjectProfileService } from "./project-profile.service";

@Controller("api/project-profile")
export class ProjectProfileController {
  constructor(
    @Inject(ProjectProfileService) private readonly projectProfileService: ProjectProfileService
  ) {}

  @Get()
  getCurrent() {
    return this.projectProfileService.getCurrent();
  }

  @Post()
  create(@Body() body: CreateProjectProfileDto) {
    return this.projectProfileService.create(body);
  }

  @Patch()
  update(@Body() body: UpdateProjectProfileDto) {
    return this.projectProfileService.update(body);
  }
}

import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { createValidationPipe } from "../../common/validation/create-validation-pipe";
import { AiGenerateExpansionDto } from "./dto/ai-generate-expansion.dto";
import { RuleGenerateExpansionDto } from "./dto/rule-generate-expansion.dto";
import { SaveExpansionCandidatesDto } from "./dto/save-expansion-candidates.dto";
import { GeoExpansionService } from "./geo-expansion.service";

@Controller("api/expansion")
export class GeoExpansionController {
  constructor(
    @Inject(GeoExpansionService) private readonly geoExpansionService: GeoExpansionService
  ) {}

  @Post("rule-generate")
  ruleGenerate(
    @Body(createValidationPipe(RuleGenerateExpansionDto)) body: RuleGenerateExpansionDto
  ) {
    return this.geoExpansionService.ruleGenerate(body);
  }

  @Post("ai-generate")
  aiGenerate(@Body(createValidationPipe(AiGenerateExpansionDto)) body: AiGenerateExpansionDto) {
    return this.geoExpansionService.aiGenerate(body);
  }

  @Get("jobs/:id")
  getJob(@Param("id") id: string) {
    return this.geoExpansionService.getJob(id);
  }

  @Post("jobs/:id/save-candidates")
  saveCandidates(
    @Param("id") id: string,
    @Body(createValidationPipe(SaveExpansionCandidatesDto)) body: SaveExpansionCandidatesDto
  ) {
    return this.geoExpansionService.saveCandidates(id, body);
  }
}

import { IsIn } from "class-validator";

export class UpdateAftersalesConversationStatusDto {
  @IsIn(["active", "archived"])
  status!: "active" | "archived";
}

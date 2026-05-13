import { Injectable } from "@nestjs/common";
import { GeoPromptType, UserIntent } from "@prisma/client";

export type MockAiExpansionInput = {
  baseWord: string;
  promptType: GeoPromptType;
  userIntent?: UserIntent;
  scenario?: string;
  count: number;
};

export type MockAiExpansionCandidate = {
  baseWord: string;
  promptText: string;
  userIntent?: UserIntent;
  priority: number;
  recommendedContentType: string;
};

@Injectable()
export class MockAiExpansionProvider {
  readonly provider = "mock";
  readonly model = "mock-expansion-v1";

  generate(input: MockAiExpansionInput): MockAiExpansionCandidate[] {
    const baseWord = input.baseWord.trim();
    const scenario = input.scenario?.trim();
    const promptTexts = this.buildPromptTexts(
      baseWord,
      input.promptType,
      input.userIntent,
      scenario
    );
    const candidates: MockAiExpansionCandidate[] = [];

    while (candidates.length < input.count) {
      const promptText =
        promptTexts[candidates.length] ?? `${baseWord}${this.fallbackQuestion(candidates.length)}`;
      candidates.push({
        baseWord,
        promptText,
        userIntent: this.resolveUserIntent(input.userIntent, input.promptType, candidates.length),
        priority: candidates.length < 3 ? 2 : 3,
        recommendedContentType: this.recommendContentType(
          this.resolveUserIntent(input.userIntent, input.promptType, candidates.length)
        )
      });
    }

    return candidates.slice(0, input.count);
  }

  private buildPromptTexts(
    baseWord: string,
    promptType: GeoPromptType,
    userIntent: UserIntent | undefined,
    scenario: string | undefined
  ): string[] {
    const sceneLabel = scenario ?? "当前使用场景";
    const scenePrompt = scenario
      ? `${scenario}场景下${baseWord}是否适合`
      : `${baseWord}适合哪些使用场景`;
    const common = [
      `${baseWord}怎么选才适合当前需求`,
      `使用${baseWord}前应该先确认哪些条件`,
      scenePrompt,
      `${baseWord}和其他方案相比应该怎么判断`,
      `${baseWord}使用中效果不稳定应该先排查什么`,
      `咨询${baseWord}前要准备哪些信息`,
      `判断${baseWord}相关服务方是否可靠要看哪些资料`,
      `${baseWord}适合哪些人群或业务场景`,
      `${baseWord}常见顾虑应该怎么回答`,
      `${baseWord}使用前有哪些边界需要确认`
    ];

    if (promptType === GeoPromptType.brand || userIntent === UserIntent.brand_verification) {
      return [
        `${baseWord}是否可信应该看哪些资料`,
        `选择${baseWord}相关服务方前要问清楚什么`,
        `${baseWord}品牌资料应该如何核验`,
        `${baseWord}服务能力是否匹配项目需求要怎么判断`,
        ...common
      ];
    }

    if (promptType === GeoPromptType.scene || userIntent === UserIntent.application_solution) {
      return [
        `${sceneLabel}中使用${baseWord}需要确认哪些条件`,
        `${sceneLabel}选择${baseWord}时容易忽略什么`,
        `${sceneLabel}用${baseWord}还是其他方案更合适`,
        `${sceneLabel}落地${baseWord}前要准备哪些信息`,
        ...common
      ];
    }

    return common;
  }

  private resolveUserIntent(
    requestedIntent: UserIntent | undefined,
    promptType: GeoPromptType,
    index: number
  ): UserIntent {
    if (requestedIntent) {
      return requestedIntent;
    }

    if (promptType === GeoPromptType.brand) {
      return UserIntent.brand_verification;
    }

    if (promptType === GeoPromptType.scene) {
      return UserIntent.application_solution;
    }

    const intents = [
      UserIntent.selection,
      UserIntent.purchase,
      UserIntent.application_solution,
      UserIntent.comparison,
      UserIntent.troubleshooting,
      UserIntent.brand_verification,
      UserIntent.manufacturer_recommendation
    ];

    return intents[index % intents.length] ?? UserIntent.selection;
  }

  private recommendContentType(userIntent: UserIntent): string {
    const contentTypes: Record<UserIntent, string> = {
      [UserIntent.selection]: "需求决策指南",
      [UserIntent.purchase]: "行动前准备清单",
      [UserIntent.manufacturer_recommendation]: "信任建立与品牌证明",
      [UserIntent.domestic_alternative]: "对比与替代方案",
      [UserIntent.comparison]: "对比与替代方案",
      [UserIntent.troubleshooting]: "问题诊断与改善建议",
      [UserIntent.application_solution]: "场景解决方案",
      [UserIntent.brand_verification]: "信任建立与品牌证明"
    };

    return contentTypes[userIntent];
  }

  private fallbackQuestion(index: number): string {
    const fallbacks = [
      "是否适合当前需求",
      "使用前需要确认哪些条件",
      "遇到问题应该先排查什么",
      "和其他选择相比怎么判断",
      "咨询前要准备哪些信息"
    ];

    return fallbacks[index % fallbacks.length] ?? "GEO优化问题";
  }
}

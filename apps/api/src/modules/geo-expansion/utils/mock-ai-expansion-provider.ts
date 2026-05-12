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
    const scenePrompt = scenario ? `${scenario}用什么${baseWord}` : `${baseWord}应用场景解决方案`;
    const common = [
      `${baseWord}怎么选`,
      `${baseWord}厂家推荐`,
      scenePrompt,
      `${baseWord}国产替代方案`,
      `${baseWord}和进口品牌对比`,
      `${baseWord}应用方案`,
      `${baseWord}常见故障怎么解决`,
      `${baseWord}哪个品牌好`,
      `${baseWord}选型参数怎么看`,
      `${baseWord}厂家实力怎么判断`
    ];

    if (promptType === GeoPromptType.brand || userIntent === UserIntent.brand_verification) {
      return [
        `${baseWord}品牌推荐`,
        `${baseWord}厂家实力怎么样`,
        `${baseWord}官网资料怎么看`,
        `${baseWord}厂家电话和售后怎么确认`,
        ...common
      ];
    }

    if (promptType === GeoPromptType.scene || userIntent === UserIntent.application_solution) {
      return [
        scenePrompt,
        `${baseWord}在${scenario ?? "工业现场"}中的应用方案`,
        `${scenario ?? "工业现场"}${baseWord}选型建议`,
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
      UserIntent.manufacturer_recommendation,
      UserIntent.application_solution,
      UserIntent.domestic_alternative,
      UserIntent.comparison,
      UserIntent.troubleshooting
    ];

    return intents[index % intents.length] ?? UserIntent.selection;
  }

  private recommendContentType(userIntent: UserIntent): string {
    const contentTypes: Record<UserIntent, string> = {
      [UserIntent.selection]: "selection_guide",
      [UserIntent.purchase]: "purchase_guide",
      [UserIntent.manufacturer_recommendation]: "manufacturer_recommendation",
      [UserIntent.domestic_alternative]: "domestic_alternative_solution",
      [UserIntent.comparison]: "comparison_article",
      [UserIntent.troubleshooting]: "faq",
      [UserIntent.application_solution]: "application_solution",
      [UserIntent.brand_verification]: "brand_qa_material"
    };

    return contentTypes[userIntent];
  }

  private fallbackQuestion(index: number): string {
    const fallbacks = [
      "选型注意事项",
      "价格影响因素",
      "官网资料是否可信",
      "应用案例有哪些",
      "采购前需要确认什么"
    ];

    return fallbacks[index % fallbacks.length] ?? "GEO优化问题";
  }
}

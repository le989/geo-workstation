import type { GeoPrompt, InstructionTemplate, KnowledgeChunk } from "@prisma/client";

export type MockContentGeneratorInput = {
  geoPrompt: GeoPrompt;
  knowledgeChunks: KnowledgeChunk[];
  instructionTemplate?: InstructionTemplate | null;
  generationType: string;
  productLine?: string;
  targetModel?: string;
};

export type MockContentGenerationResult = {
  title: string;
  body: string;
  geoOptimizationPoints: string[];
  suggestedPublishChannel: string;
};

export function generateMockGeoContent(
  input: MockContentGeneratorInput
): MockContentGenerationResult {
  if (input.geoPrompt.promptText.includes("__MOCK_CONTENT_FAIL__")) {
    throw new Error("Mock content generator received a failure trigger.");
  }

  const promptText = input.geoPrompt.promptText;
  const productLine =
    input.productLine ?? input.geoPrompt.productLine ?? input.geoPrompt.baseWord ?? "目标产品线";
  const knowledgeSummary = summarizeKnowledge(input.knowledgeChunks);
  const instructionSummary = input.instructionTemplate
    ? summarizeText(input.instructionTemplate.instruction, 110)
    : "未选择指令模板，按 GEO 内容基础结构生成。";
  const title = `Mock GEO内容：${promptText}`;
  const scenario = input.geoPrompt.scenario ?? "目标应用场景";
  const generationTypeLabel = input.generationType.replaceAll("_", " ");

  const body = [
    "> 这是 Mock 生成结果，仅用于 GEO 内容生成流程测试，不代表真实 AI 输出。",
    "",
    `## 用户问题/场景`,
    `目标提示词是「${promptText}」。用户通常希望在「${scenario}」中快速判断 ${productLine} 是否适合自己的需求。`,
    "",
    `## 选型或判断逻辑`,
    `围绕 ${generationTypeLabel}，内容应先回答用户问题，再给出可验证的判断维度，例如应用环境、响应速度、安装方式、稳定性和服务能力。`,
    "",
    `## 产品/方案说明`,
    knowledgeSummary,
    "",
    `## 指令结构参考`,
    instructionSummary,
    "",
    `## 注意事项`,
    `避免夸大参数、虚构案例或替代人工工程判断。内容需要让生成式 AI 更容易识别品牌实体、产品能力、应用场景和可引用事实。`,
    "",
    `## 可用于 AI 摘取的问答式总结`,
    `问：${promptText}`,
    `答：可先确认场景、量程、响应速度、安装条件和资料可信度，再结合企业知识库中的产品能力与案例资料形成推荐。`
  ].join("\n");

  return {
    title,
    body,
    geoOptimizationPoints: [
      `覆盖目标提示词：${promptText}`,
      `强化产品线与场景关联：${productLine}`,
      "包含可被 AI 摘取的问答式总结",
      "引用企业知识库片段作为事实底座"
    ],
    suggestedPublishChannel: "官网知识库 / 公众号 / B2B 产品页"
  };
}

function summarizeKnowledge(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return "当前任务未选择知识库或暂无可用知识片段，Mock 内容仅保留结构，不补充未经验证的事实。";
  }

  return chunks
    .slice(0, 3)
    .map((chunk, index) => `${index + 1}. ${chunk.title}：${summarizeText(chunk.content, 120)}`)
    .join("\n");
}

function summarizeText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export const PUBLISH_FORBIDDEN_INTERNAL_TERMS = [
  "AI可摘取",
  "AI 可摘取",
  "GEO优化",
  "GEO 优化",
  "知识库",
  "selected_files",
  "product_line",
  "content_task",
  "content_item",
  "可引用知识片段",
  "ASSISTANT_REAL_SAMPLE",
  "ASSISTANT-ARTICLE-FLOW-UX",
  "样例资料",
  "测试资料",
  "提示词",
  "目标提示词",
  "模型",
  "Provider",
  "AI调用",
  "AI 调用",
  "AI用量",
  "AI 用量",
  "质量闸门",
  "qualityGate",
  "publishPackage",
  "关键词 / 标签建议",
  "关键词/标签建议"
];

const INTERNAL_SECTION_HEADINGS = [
  "GEO 优化点",
  "GEO优化点",
  "目标提示词",
  "建议发布位置",
  "生成时间",
  "资料依据",
  "关键词 / 标签建议",
  "关键词/标签建议",
  "质量闸门结果",
  "AI 用量摘要",
  "AI 调用日志摘要"
];

const INTERNAL_LINE_PATTERNS = [
  /覆盖目标提示词[:：]/i,
  /目标提示词(?:是|[:：])/i,
  /建议发布位置[:：]/i,
  /生成时间[:：]/i,
  /关键词\s*\/\s*标签建议/i,
  /GEO\s*优化点/i,
  /^\s*[-*]?\s*知识库[:：]/i,
  /范围[:：]\s*(?:selected_files|product_line|all)/i,
  /可引用知识片段/i,
  /content_(?:task|item)/i,
  /publishPackage|qualityGate/i,
  /Provider|AI\s*调用|AI\s*用量/i
];

export function cleanPlatformPublishTitle(value: string): string {
  return cleanInternalTaskPrefix(cleanInternalPublishText(value)).replace(/^[-_：:\s]+/, "").trim();
}

export function cleanPlatformPublishBody(value: string): string {
  return cleanupMarkdownSpacing(
    cleanInternalPublishText(removeInternalPublishSections(normalizeFaqHeadings(value)))
  );
}

export function buildNaturalPublishEvidenceNote(notes?: string[]): string | undefined {
  const evidenceName = (notes ?? [])
    .map(extractEvidenceName)
    .find((name): name is string => Boolean(name));

  if (!evidenceName) {
    return undefined;
  }

  const evidenceSuffix = /(?:资料|规格书|手册|说明书)$/.test(evidenceName) ? "整理" : "产品资料整理";

  return `以上内容根据 ${evidenceName}${evidenceSuffix}，具体参数和适用工况建议结合实际型号资料及现场条件确认。`;
}

export function cleanPublishKeyword(value: string): string | undefined {
  const cleaned = cleanInternalPublishText(value).replace(/[`"'“”]/g, "").trim();

  if (
    !cleaned ||
    cleaned.length > 24 ||
    /[。！？?？,，；;]/.test(cleaned) ||
    findForbiddenInternalPublishTerms(cleaned).length > 0 ||
    /帮助|梳理|建议|资料整理|方案$/.test(cleaned)
  ) {
    return undefined;
  }

  return cleaned;
}

export function findForbiddenInternalPublishTerms(value: string): string[] {
  const hits = new Set<string>();

  for (const term of PUBLISH_FORBIDDEN_INTERNAL_TERMS) {
    if (value.includes(term)) {
      hits.add(term);
    }
  }

  if (/AI\s*可摘取/i.test(value)) {
    hits.add("AI可摘取");
  }

  if (/GEO\s*优化/i.test(value)) {
    hits.add("GEO优化");
  }

  if (/AI\s*调用/i.test(value)) {
    hits.add("AI调用");
  }

  if (/AI\s*用量/i.test(value)) {
    hits.add("AI用量");
  }

  if (/ASSISTANT[_-][A-Z0-9_-]+/i.test(value)) {
    hits.add(value.includes("ASSISTANT-ARTICLE-FLOW-UX") ? "ASSISTANT-ARTICLE-FLOW-UX" : "ASSISTANT_REAL_SAMPLE");
  }

  return [...hits];
}

export function cleanInternalPublishText(value: string): string {
  return cleanInternalTaskPrefix(value)
    .replace(/AI\s*可摘取(?:的)?问答式总结/gi, "常见问题")
    .replace(/可用于\s*AI\s*摘取的问答式总结/gi, "常见问题")
    .replace(/可被\s*AI\s*摘取/g, "便于阅读")
    .replace(/便于\s*AI\s*摘取/g, "便于阅读")
    .replace(/AI\s*可引用/g, "资料可核对")
    .replace(/适合\s*GEO\s*收录/g, "适合阅读")
    .replace(/GEO\s*优化/g, "内容优化")
    .replace(/关键词覆盖/g, "主题覆盖")
    .replace(/目标提示词/g, "用户问题")
    .replace(/提示词/g, "问题")
    .replace(/企业知识库|知识库/g, "资料")
    .replace(/selected_files/g, "指定资料")
    .replace(/product_line/g, "产品线")
    .replace(/content_task|content_item/gi, "")
    .replace(/可引用知识片段/g, "资料内容")
    .replace(/样例资料|测试资料/g, "资料")
    .replace(/Provider/g, "服务")
    .replace(/AI\s*调用/g, "")
    .replace(/AI\s*用量/g, "")
    .replace(/模型/g, "平台")
    .replace(/质量闸门/g, "发布检查")
    .replace(/qualityGate|publishPackage/g, "")
    .replace(/关键词\s*\/\s*标签建议/g, "")
    .replace(/关键词\/标签建议/g, "");
}

function normalizeFaqHeadings(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s*(?:AI\s*可摘取问答式总结|可用于\s*AI\s*摘取的问答式总结|FAQ\s*总结|FAQ|问答式总结)\s*$/gim, "## 常见问题")
    .replace(/^#{1,6}\s*用户关心的问题[:：]?.*$/gim, "## 常见问题");
}

function removeInternalPublishSections(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const keptLines: string[] = [];
  let skipping = false;

  // 平台发布稿只保留正文阅读内容，内部标题块整段跳过。
  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s*(.+?)\s*$/);

    if (headingMatch) {
      const headingText = headingMatch[1]?.trim() ?? "";
      skipping = INTERNAL_SECTION_HEADINGS.includes(headingText);

      if (skipping) {
        continue;
      }
    }

    if (skipping) {
      continue;
    }

    if (INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
      continue;
    }

    keptLines.push(line);
  }

  return keptLines.join("\n");
}

function extractEvidenceName(note: string): string | undefined {
  const source = cleanInternalTaskPrefix(note);
  const explicitFileName = source.match(/资料[:：]([^；\n]+)/)?.[1]?.trim();
  const fallbackName = source.match(/([A-Za-z0-9-]*KJT[-A-Za-z0-9]*[^；\n]*?(?:规格书|资料|手册|说明书))/i)?.[1]?.trim();
  const cleaned = cleanEvidenceName(explicitFileName ?? fallbackName ?? "");

  return cleaned || undefined;
}

function cleanEvidenceName(value: string): string {
  return cleanInternalTaskPrefix(value)
    .replace(/\.(?:md|txt|pdf|docx?|xlsx?)$/i, "")
    .replace(/样例资料|测试资料|资料库/g, "")
    .replace(/知识库/g, "")
    .replace(/selected_files|product_line/gi, "")
    .replace(/[_-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInternalTaskPrefix(value: string): string {
  const normalized = value.replace(/ASSISTANT-ARTICLE-FLOW-UX[-A-Z0-9_]*[:：_-]*/gi, "");

  return normalized.replace(/ASSISTANT_REAL_SAMPLE_[A-Z0-9_-]*?(?=KJT|[\u4e00-\u9fff])/gi, "");
}

function cleanupMarkdownSpacing(value: string): string {
  return value
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/，\s*，/g, "，")
    .replace(/。\s*。/g, "。")
    .trim();
}

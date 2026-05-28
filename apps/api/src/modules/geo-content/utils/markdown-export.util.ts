import type { ContentItem, GeoPrompt } from "@prisma/client";

export type MarkdownExportContentItem = ContentItem & {
  geoPrompt?: GeoPrompt | null;
};

export type ReviewMarkdownInput = {
  title: string;
  body: string;
  taskInfo?: {
    taskName?: string;
    targetPrompt?: string;
    scopeSummary?: string;
  };
  qualityGateSummary?: string[];
  aiUsageSummary?: string[];
  aiCallLogSummary?: string[];
  publishPackageMarkdown?: string;
  manualReviewItems?: string[];
};

export type PublishMarkdownInput = {
  title: string;
  body: string;
  faqs?: Array<{
    question?: string;
    answer?: string;
  }>;
  keywords?: string[];
  evidenceNotes?: string[];
};

export function buildContentItemMarkdown(item: MarkdownExportContentItem): string {
  return buildContentItemReviewMarkdown({
    title: item.title,
    body: item.body,
    taskInfo: {
      targetPrompt: item.geoPrompt?.promptText ?? "未关联 GEO 提示词"
    },
    manualReviewItems: ["发布前请人工核对参数、资料依据和平台规则。"]
  });
}

export function buildContentItemReviewMarkdown(input: ReviewMarkdownInput): string {
  const body = cleanupMarkdownText(unwrapApiResponseText(input.body));
  const publishPackageMarkdown = input.publishPackageMarkdown
    ? cleanupMarkdownText(unwrapApiResponseText(input.publishPackageMarkdown))
    : undefined;
  const taskInfoLines = [
    input.taskInfo?.taskName ? `- 任务：${input.taskInfo.taskName}` : undefined,
    input.taskInfo?.targetPrompt ? `- 目标提示词：${input.taskInfo.targetPrompt}` : undefined,
    input.taskInfo?.scopeSummary ? `- 资料范围：${input.taskInfo.scopeSummary}` : undefined
  ].filter(isNonEmptyString);

  return [
    `# ${input.title}`,
    "",
    ...(taskInfoLines.length > 0 ? ["## 任务信息", ...taskInfoLines, ""] : []),
    ...(toListSection("质量闸门结果", input.qualityGateSummary) ?? []),
    ...(toListSection("AI 用量摘要", input.aiUsageSummary) ?? []),
    ...(toListSection("AI 调用日志摘要", input.aiCallLogSummary) ?? []),
    "## 正文",
    body,
    "",
    ...(publishPackageMarkdown ? ["## 发布包", publishPackageMarkdown, ""] : []),
    ...(toListSection("人工复核提示", input.manualReviewItems) ?? [])
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildContentItemPublishMarkdown(input: PublishMarkdownInput): string {
  const body = stripInternalExportSections(cleanupMarkdownText(unwrapApiResponseText(input.body)));
  const bodyHasFaq = /(^|\n)#{1,6}\s*FAQ\b|问[:：]/i.test(body);
  const faqLines =
    !bodyHasFaq && input.faqs && input.faqs.length > 0
      ? [
          "## FAQ",
          ...input.faqs.flatMap((faq) => {
            const question = cleanupInlineText(faq.question);
            const answer = cleanupInlineText(faq.answer);

            return question && answer ? [`**问：${question}**`, answer, ""] : [];
          })
        ]
      : [];
  const evidenceLines = (input.evidenceNotes ?? [])
    .map(cleanupInlineText)
    .filter(isNonEmptyString)
    .map((note) => `- ${note}`);
  const keywordLines = (input.keywords ?? [])
    .map(cleanupInlineText)
    .filter(isNonEmptyString)
    .map((keyword) => `\`${keyword}\``);

  return [
    `# ${input.title}`,
    "",
    body,
    "",
    ...faqLines,
    ...(evidenceLines.length > 0 ? ["## 资料依据", ...evidenceLines, ""] : []),
    ...(keywordLines.length > 0
      ? ["## 关键词 / 标签建议", keywordLines.join("、"), ""]
      : [])
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function unwrapApiResponseText(value: string): string {
  const trimmed = value.trim();

  if (!looksLikeJsonObject(trimmed)) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const unwrapped = unwrapApiResponseData(parsed);

    if (typeof unwrapped === "string") {
      return unwrapped;
    }

    if (unwrapped !== parsed) {
      return JSON.stringify(unwrapped, null, 2);
    }
  } catch {
    // 导出不能因为历史正文不是标准 JSON 而失败，解析失败时按原文输出。
    return value;
  }

  return value;
}

function unwrapApiResponseData(value: unknown): unknown {
  if (isRecord(value) && "data" in value && "code" in value && "message" in value) {
    const data = value.data;

    if (typeof data === "string") {
      return unwrapApiResponseText(data);
    }

    return data;
  }

  return value;
}

function cleanupMarkdownText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function cleanupInlineText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = unwrapApiResponseText(value).replace(/\s+/g, " ").trim();

  return cleaned.length > 0 ? cleaned : undefined;
}

function stripInternalExportSections(markdown: string): string {
  const internalHeadings = [
    "任务信息",
    "目标提示词",
    "内容正文",
    "GEO 优化点",
    "建议发布位置",
    "生成时间",
    "质量闸门结果",
    "AI 用量摘要",
    "AI 调用日志摘要"
  ];
  const lines = markdown.split("\n");
  const keptLines: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s*(.+?)\s*$/);

    if (headingMatch) {
      const headingText = headingMatch[1]?.trim();
      skipping = Boolean(headingText && internalHeadings.includes(headingText));

      if (skipping) {
        continue;
      }
    }

    if (!skipping) {
      keptLines.push(line);
    }
  }

  return keptLines.join("\n").trim();
}

function toListSection(title: string, values?: string[]): string[] | undefined {
  const lines = (values ?? []).map(cleanupInlineText).filter(isNonEmptyString);

  return lines.length > 0 ? [`## ${title}`, ...lines.map((line) => `- ${line}`), ""] : undefined;
}

function looksLikeJsonObject(value: string): boolean {
  return value.startsWith("{") && value.endsWith("}");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

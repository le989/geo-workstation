import type { ContentItem, GeoPrompt } from "@prisma/client";
import { jsonStringArray } from "./normalize-content-item";

export type MarkdownExportContentItem = ContentItem & {
  geoPrompt?: GeoPrompt | null;
};

export function buildContentItemMarkdown(item: MarkdownExportContentItem): string {
  const optimizationPoints = jsonStringArray(item.geoOptimizationPoints);

  return [
    `# ${item.title}`,
    "",
    "## 目标提示词",
    item.geoPrompt?.promptText ?? "未关联 GEO 提示词",
    "",
    "## 内容正文",
    item.body,
    "",
    "## GEO 优化点",
    optimizationPoints.length > 0
      ? optimizationPoints.map((point) => `- ${point}`).join("\n")
      : "- 暂无 GEO 优化点",
    "",
    "## 建议发布位置",
    item.suggestedPublishChannel ?? "暂未设置",
    "",
    "## 生成时间",
    item.createdAt.toISOString()
  ].join("\n");
}

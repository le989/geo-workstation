import type { ReportExportType } from "@/api/reports";
import { generationTypeLabelMap, contentItemStatusLabelMap } from "@/config/content-options";
import {
  coverageStatusLabelMap,
  geoPromptTypeLabelMap,
  userIntentLabelMap
} from "@/config/geo-prompt-options";
import { materialTypeLabelMap, parseStatusLabelMap } from "@/config/knowledge-options";

export const reportExportTypeLabelMap: Record<ReportExportType, string> = {
  geo_overview: "总览",
  prompt_coverage: "提示词覆盖",
  model_coverage: "模型覆盖",
  content_coverage: "内容覆盖",
  knowledge_coverage: "知识库覆盖",
  optimization_suggestions: "优化建议"
};

export const optimizationSuggestionTypeLabelMap: Record<string, string> = {
  failed_content_task: "失败内容任务",
  product_line_without_knowledge: "产品线缺知识库",
  prompt_not_mentioned: "品牌未提及",
  prompt_without_content: "提示词缺内容",
  prompt_without_record: "提示词缺检测"
};

export const reportLabelForKey = (key: string) =>
  geoPromptTypeLabelMap[key as keyof typeof geoPromptTypeLabelMap] ??
  userIntentLabelMap[key as keyof typeof userIntentLabelMap] ??
  coverageStatusLabelMap[key] ??
  generationTypeLabelMap[key] ??
  contentItemStatusLabelMap[key] ??
  materialTypeLabelMap[key] ??
  parseStatusLabelMap[key as keyof typeof parseStatusLabelMap] ??
  key;

export const formatReportNumber = (value?: number | null) => `${value ?? 0}`;

export const formatReportPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
};

export const toReportPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value * 100));
};

export const toDistributionRows = (distribution?: Record<string, number>, valueType = "count") =>
  Object.entries(distribution ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      label: reportLabelForKey(key),
      rawValue: value,
      value: valueType === "rate" ? formatReportPercent(value) : formatReportNumber(value)
    }));

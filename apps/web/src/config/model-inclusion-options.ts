import type { RecordMethod } from "@/api/model-inclusion";

export const recordMethodOptions: Array<{ label: string; value: RecordMethod }> = [
  { label: "人工录入", value: "manual" },
  { label: "批量导入", value: "import" },
  { label: "API 记录", value: "api" }
];

export const booleanFilterOptions = [
  { label: "是", value: true },
  { label: "否", value: false }
];

export const recordMethodLabelMap = Object.fromEntries(
  recordMethodOptions.map((item) => [item.value, item.label])
) as Record<RecordMethod, string>;

export const formatBooleanLabel = (
  value: boolean,
  labels: { trueLabel: string; falseLabel: string }
) => (value ? labels.trueLabel : labels.falseLabel);

export const formatRate = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
};

export const formatDistribution = (distribution?: Record<string, number>) =>
  Object.entries(distribution ?? {}).sort((a, b) => b[1] - a[1]);

export const formatCompetitors = (competitors?: string[]) =>
  competitors && competitors.length > 0 ? competitors.join("、") : "--";

export const truncateSummary = (value?: string, maxLength = 110) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

export const parseBooleanLike = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "是"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "否"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
};

import type { ParseStatus } from "@/api/knowledge";

export const knowledgeBaseStatusOptions = [
  { label: "启用", value: "active" },
  { label: "停用", value: "disabled" }
];

export const sourceTypeOptions = [
  { label: "粘贴文本", value: "pasted_text" },
  { label: "文本导入", value: "text_import" },
  { label: "上传文件", value: "uploaded_file" }
];

export const materialTypeOptions = [
  { label: "产品资料", value: "product_info" },
  { label: "常见问题", value: "faq" },
  { label: "客户案例", value: "case" },
  { label: "解决方案", value: "solution" },
  { label: "资质认证", value: "qualification" },
  { label: "对比资料", value: "comparison" },
  { label: "服务说明", value: "service" },
  { label: "文件导入", value: "file_import" }
];

export const parseStatusOptions: Array<{ label: string; value: ParseStatus }> = [
  { label: "待解析", value: "pending" },
  { label: "解析中", value: "parsing" },
  { label: "解析成功", value: "succeeded" },
  { label: "解析失败", value: "failed" }
];

export const knowledgeBaseStatusLabelMap: Record<string, string> = {
  active: "启用",
  disabled: "停用",
  enabled: "启用"
};

export const sourceTypeLabelMap = Object.fromEntries(
  sourceTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const materialTypeLabelMap = Object.fromEntries(
  materialTypeOptions.map((item) => [item.value, item.label])
) as Record<string, string>;

export const parseStatusLabelMap = Object.fromEntries(
  parseStatusOptions.map((item) => [item.value, item.label])
) as Record<ParseStatus, string>;

export const supportedKnowledgeFileExtensions = ["txt", "md", "csv"];

export const isSupportedKnowledgeFileName = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return Boolean(extension && supportedKnowledgeFileExtensions.includes(extension));
};

export const formatFileSize = (value?: number) => {
  if (!value || value <= 0) {
    return "--";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

export const formatTags = (tags?: string[]) => (tags && tags.length > 0 ? tags.join("、") : "--");

export const truncateKnowledgeText = (value?: string, maxLength = 96) => {
  if (!value) {
    return "--";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

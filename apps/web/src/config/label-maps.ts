export const aiProviderOptions = [
  { label: "模拟生成", value: "mock" },
  { label: "真实 AI 接口", value: "openai_compatible" }
] as const;

export const aiProviderLabelMap: Record<string, string> = {
  mock: "模拟生成",
  openai_compatible: "真实 AI 接口"
};

export const aiCallStatusLabelMap: Record<string, string> = {
  failed: "失败",
  pending: "待执行",
  succeeded: "已完成"
};

export const aiCallPurposeLabelMap: Record<string, string> = {
  content_generation: "内容生成",
  expansion_generation: "AI 拓词",
  geo_analysis: "GEO 诊断"
};

export const formatAiProvider = (provider?: string | null) =>
  provider ? (aiProviderLabelMap[provider] ?? provider) : "--";

export const formatProviderModel = (provider?: string | null, model?: string | null) => {
  const providerLabel = formatAiProvider(provider);
  return model ? `${providerLabel} / ${model}` : providerLabel;
};

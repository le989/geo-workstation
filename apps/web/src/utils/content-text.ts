// 兼容历史导出/生成中误保存的 API 响应包装，页面展示时只显示真正正文。
export const unwrapApiResponseText = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed) as { code?: unknown; message?: unknown; data?: unknown };

    if ("code" in parsed && "message" in parsed && typeof parsed.data === "string") {
      return parsed.data;
    }
  } catch {
    return value;
  }

  return value;
};

export const getDisplayContentText = (value: string, fallback = "正文待人工补充。") =>
  unwrapApiResponseText(value).trim() || fallback;

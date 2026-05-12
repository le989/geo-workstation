import type { ExpansionMode, ExpansionTaskStatus } from "@/api/expansion";

export const expansionModeLabelMap: Record<ExpansionMode, string> = {
  ai: "Mock AI 拓词",
  rule: "手动组合"
};

export const expansionStatusLabelMap: Record<ExpansionTaskStatus, string> = {
  cancelled: "已取消",
  failed: "失败",
  pending: "待执行",
  running: "生成中",
  succeeded: "已完成"
};

export const duplicateReasonLabelMap: Record<string, string> = {
  duplicate_in_batch: "本批重复",
  duplicate_in_database: "库内重复，不建议保存"
};

export const saveStatusLabelMap: Record<string, string> = {
  duplicate_in_batch: "本批重复",
  duplicate_in_database: "库内重复",
  pending: "待保存",
  saved: "已保存"
};

export const contentTypeLabelMap: Record<string, string> = {
  application_solution: "应用方案",
  brand_qa_material: "品牌问答素材",
  comparison_article: "对比内容",
  domestic_alternative_solution: "国产替代方案",
  faq: "FAQ",
  manufacturer_recommendation: "厂家推荐",
  purchase_guide: "采购指南",
  selection_guide: "选型指南"
};

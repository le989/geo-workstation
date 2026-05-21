import type { KnowledgeFile } from "@/api/knowledge";

export const isKnowledgeFileOfficiallyCitable = (file: KnowledgeFile) =>
  file.reviewStatus === "approved" && file.trustLevel !== "low";

export const getKnowledgeFileCitationReasons = (file: KnowledgeFile) => {
  const reasons: string[] = [];

  if (file.reviewStatus === "pending") {
    reasons.push("未审核");
  } else if (file.reviewStatus === "disabled") {
    reasons.push("已停用");
  }

  if (file.trustLevel === "low") {
    reasons.push("低可信");
  }

  return reasons;
};

export const getKnowledgeFileCitationLabel = (file: KnowledgeFile) =>
  isKnowledgeFileOfficiallyCitable(file) ? "正式可引用" : "不正式引用";

export const getKnowledgeFileCitationDescription = (file: KnowledgeFile) => {
  const reasons = getKnowledgeFileCitationReasons(file);

  return reasons.length > 0 ? reasons.join("、") : "已通过且可信度为高 / 中";
};

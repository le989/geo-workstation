const AFTERSALES_FEEDBACK_SOURCE_LABEL = "来源：售后问答反馈";
const AFTERSALES_FEEDBACK_SOURCE_DESCRIPTION =
  "说明：由管理员从售后问答反馈转入知识库草稿，待审核后进入正式知识库。";

export const formatKnowledgeSourceDescription = (value?: string | null) => {
  const sourceDescription = value?.trim();

  if (!sourceDescription) {
    return undefined;
  }

  if (sourceDescription.includes(AFTERSALES_FEEDBACK_SOURCE_LABEL)) {
    return `${AFTERSALES_FEEDBACK_SOURCE_LABEL}\n${AFTERSALES_FEEDBACK_SOURCE_DESCRIPTION}`;
  }

  return sourceDescription;
};

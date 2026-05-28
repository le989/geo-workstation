<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import type {
  ContentItem,
  ContentQualityCheckResult,
  ContentQualityRiskItem,
  FormatContentItemForPublishPayload,
  ContentTaskDetail,
  ArticlePublishPackage,
  PublishStatus,
  PublishFormatResult,
  PublishOptimizationResult
} from "@/api/content";
import ContentGenerationTypeTag from "@/components/ContentGenerationTypeTag.vue";
import ContentItemTable from "@/components/ContentItemTable.vue";
import ContentTaskStatusTag from "@/components/ContentTaskStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import PublishFormatPanel from "@/components/PublishFormatPanel.vue";
import { generationTypeLabelMap } from "@/config/content-options";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { contentTypeLabelMap, instructionTypeLabelMap } from "@/config/instruction-options";
import {
  aiCallPurposeLabelMap,
  aiCallStatusLabelMap,
  formatProviderModel
} from "@/config/label-maps";
import { getDisplayContentText } from "@/utils/content-text";

const props = defineProps<{
  modelValue: boolean;
  detail?: ContentTaskDetail | null;
  loading?: boolean;
  retrying?: boolean;
  archiving?: boolean;
  exportingIds?: string[];
  deletingIds?: string[];
  qualityCheckingIds?: string[];
  riskFixingIds?: string[];
  optimizingIds?: string[];
  formattingIds?: string[];
  publishPackageGeneratingIds?: string[];
  publishPackageExportingIds?: string[];
  publishPreviewLoadingIds?: string[];
  publishPreviewMarkdownByItemId?: Record<string, string>;
  qualityCheckResult?: {
    itemId: string;
    itemTitle: string;
    result: ContentQualityCheckResult;
  } | null;
  qualityCheckError?: string;
  publishOptimizationResult?: {
    itemId: string;
    itemTitle: string;
    result: PublishOptimizationResult;
  } | null;
  publishOptimizationError?: string;
  publishFormatResult?: {
    itemId: string;
    itemTitle: string;
    result: PublishFormatResult;
  } | null;
  publishFormatError?: string;
  canManageActions?: boolean;
}>();

type PublishPackageExportAction = "review-markdown" | "publish-markdown" | "package-txt";

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  refresh: [];
  retry: [];
  archive: [];
  view: [item: ContentItem];
  edit: [item: ContentItem];
  export: [item: ContentItem];
  delete: [item: ContentItem];
  qualityCheck: [item: ContentItem];
  fixRiskWords: [item: ContentItem];
  optimize: [item: ContentItem];
  formatPublish: [item: ContentItem, payload: FormatContentItemForPublishPayload];
  generatePublishPackage: [item: ContentItem];
  copyPublishPackage: [item: ContentItem];
  copyDraft: [item: ContentItem];
  regenerate: [];
  exportPublishPackage: [item: ContentItem, action: PublishPackageExportAction];
}>();

const hasFailedItems = computed(
  () => props.detail?.items.some((item) => item.status === "failed") ?? false
);
const canManageActions = computed(() => props.canManageActions !== false);
const canRetry = computed(
  () =>
    canManageActions.value &&
    props.detail?.task.status !== "cancelled" &&
    (props.detail?.task.status === "failed" || hasFailedItems.value)
);
const canArchive = computed(
  () =>
    canManageActions.value &&
    Boolean(props.detail?.task) &&
    props.detail?.task.status !== "running" &&
    props.detail?.task.status !== "cancelled"
);
const isRealAiTask = computed(() => props.detail?.task.provider === "openai_compatible");
const failedItemReasons = computed(
  () =>
    props.detail?.items
      .filter((item) => item.status === "failed" && item.errorMessage)
      .map((item) => item.errorMessage as string) ?? []
);
const failureAlertTitle = computed(() =>
  isRealAiTask.value
    ? "文章任务已创建，但真实 AI 生成失败，请查看失败原因。"
    : "当前任务已创建，但部分文章生成失败，请查看失败原因。"
);
const failureAlertDescription = computed(() => {
  const firstReason = failedItemReasons.value[0];

  if (firstReason) {
    return `失败原因：${firstReason}`;
  }

  return isRealAiTask.value
    ? "请检查生成配置、模型服务和网络连通性，必要时调整生成方式后重试。"
    : "请查看文章状态后重试失败任务。";
});

const expandedContentItemIds = ref<string[]>([]);
const articleBodyRef = ref<HTMLElement | null>(null);

type ArticlePreviewBlock =
  | {
      type: "heading";
      level: number;
      html: string;
    }
  | {
      type: "paragraph";
      html: string;
    }
  | {
      type: "list";
      items: string[];
    };

const escapeArticleHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderInlineArticleMarkdown = (value: string) =>
  escapeArticleHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const parseAssistantArticleBlocks = (body: string): ArticlePreviewBlock[] => {
  const blocks: ArticlePreviewBlock[] = [];
  let currentListItems: string[] = [];

  const flushListItems = () => {
    if (currentListItems.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: currentListItems
    });
    currentListItems = [];
  };

  // 将正文里的 Markdown 标记转成阅读块，详情页只负责预览，不影响复制发布稿。
  for (const rawLine of getDisplayContentText(body).split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushListItems();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      flushListItems();
      blocks.push({
        type: "heading",
        level: Math.min(headingMatch[1]?.length ?? 3, 4),
        html: renderInlineArticleMarkdown(headingMatch[2] ?? "")
      });
      continue;
    }

    const listItemMatch = line.match(/^(?:[-*]\s+|\d+[.、]\s+)(.+)$/);

    if (listItemMatch) {
      currentListItems.push(renderInlineArticleMarkdown(listItemMatch[1] ?? ""));
      continue;
    }

    flushListItems();
    blocks.push({
      type: "paragraph",
      html: renderInlineArticleMarkdown(line)
    });
  }

  flushListItems();
  return blocks;
};

const isGeneratedContentItem = (item: ContentItem) => {
  const hasReadableContent = Boolean(item.title.trim() || item.body.trim());

  return hasReadableContent && item.status !== "failed" && item.status !== "cancelled";
};

const contentItemsCount = computed(() => props.detail?.items.length ?? 0);
const generatedItems = computed(() => props.detail?.items.filter(isGeneratedContentItem) ?? []);
const generatedItemsCount = computed(() => generatedItems.value.length);
const hasGeneratedContent = computed(() => generatedItemsCount.value > 0);
// 助理视图只聚焦当前主文章，避免把多条内容项和内部字段推到第一屏。
const primaryArticleItem = computed(() => {
  const primaryItemId = props.detail?.task.primaryItem?.id;

  return (
    generatedItems.value.find((item) => item.id === primaryItemId) ??
    generatedItems.value[0] ??
    null
  );
});
const primaryArticlePreviewMarkdown = computed(() => {
  const itemId = primaryArticleItem.value?.id;

  return itemId ? (props.publishPreviewMarkdownByItemId?.[itemId] ?? "") : "";
});
const isPrimaryArticlePreviewLoading = computed(() => {
  const itemId = primaryArticleItem.value?.id;

  return Boolean(itemId && props.publishPreviewLoadingIds?.includes(itemId));
});
const primaryArticleBlocks = computed(() =>
  parseAssistantArticleBlocks(primaryArticlePreviewMarkdown.value)
);
const persistedQualityGateItems = computed(
  () =>
    props.detail?.items
      .filter((item) => item.qualityGateResult)
      .map((item) => ({
        item,
        gate: item.qualityGateResult!
      })) ?? []
);
const latestQualityGateResult = computed(
  () => props.qualityCheckResult?.result.qualityGateResult ?? persistedQualityGateItems.value[0]?.gate ?? null
);
const hasQualityCheck = computed(
  () => Boolean(props.qualityCheckResult) || persistedQualityGateItems.value.length > 0
);
const hasPublishOptimization = computed(() => Boolean(props.publishOptimizationResult));
const hasPublishFormat = computed(() => Boolean(props.publishFormatResult));
const publishPackageItems = computed(() => generatedItems.value.filter((item) => item.status !== "failed"));
const hasPublishPackage = computed(() =>
  publishPackageItems.value.some((item) => Boolean(item.publishPackage))
);
const needsHumanReview = computed(
  () =>
    props.qualityCheckResult?.result.publishReadiness.needsHumanReview ??
    (latestQualityGateResult.value ? latestQualityGateResult.value.publishStatus !== "publish_ready" : false)
);
const hasRiskyQuality = computed(
  () =>
    props.qualityCheckResult?.result.level === "risky" ||
    latestQualityGateResult.value?.publishStatus === "not_recommended"
);
const primaryQualityGateResult = computed(
  () => primaryArticleItem.value?.qualityGateResult ?? latestQualityGateResult.value
);
const isPrimaryArticleCopyable = computed(
  () => primaryArticleItem.value?.publishStatus === "publish_ready"
);
const isPrimaryArticleNeedsReview = computed(
  () =>
    Boolean(primaryArticleItem.value) &&
    primaryArticleItem.value?.publishStatus !== "publish_ready"
);
const assistantStatusCard = computed(() => {
  if (!primaryArticleItem.value) {
    return {
      type: "info" as const,
      title: "这篇文章还没有生成完成",
      description: "请返回列表刷新状态，或等待文章生成完成后再查看。"
    };
  }

  if (isPrimaryArticleCopyable.value) {
    return {
      type: "success" as const,
      title: "这篇文章已通过发布检查，可以复制发布稿",
      description: "复制后可粘贴到百家号、头条、知乎等发布平台，发布前仍建议快速预览格式。"
    };
  }

  return {
    type: "warning" as const,
    title: "这篇文章暂不建议直接发布",
    description: "请先处理下面的问题；如需带风险内容继续修改，只能复制草稿。"
  };
});

const getContentPreview = (body: string, maxLength = 360) => {
  const normalized = getDisplayContentText(body).replace(/\s+/g, " ").trim();

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const isTechnicalTaskName = (value: string) =>
  /\b(phase|smoke|mock|debug|test|batch)\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(value);

const getDisplayTaskName = () => {
  const name = props.detail?.task.name;

  return name && !isTechnicalTaskName(name) ? name : "文章任务详情";
};

const isContentExpanded = (id: string) => expandedContentItemIds.value.includes(id);

const toggleContentPreview = (id: string) => {
  expandedContentItemIds.value = isContentExpanded(id)
    ? expandedContentItemIds.value.filter((itemId) => itemId !== id)
    : [...expandedContentItemIds.value, id];
};

const findPromptText = (geoPromptId?: string | null) =>
  props.detail?.prompts.find((prompt) => prompt.id === geoPromptId)?.promptText ?? "--";

const getKnowledgeScopeSummary = () => {
  const task = props.detail?.task;
  const scope = task?.knowledgeScope;

  if (scope?.type === "selected_files") {
    return `指定资料：${scope.selectedKnowledgeFileIds.length} 份`;
  }

  if (scope?.type === "product_line") {
    return `产品线：${formatOptional(task?.productLine)}`;
  }

  return "全部资料";
};

const getWorkflowStepStatus = (index: number) => {
  const taskStatus = props.detail?.task.status;

  if (index === 0) {
    if (taskStatus === "failed" || hasFailedItems.value) {
      return "error";
    }
    if (hasGeneratedContent.value) {
      return "success";
    }
    if (taskStatus === "running" || taskStatus === "pending") {
      return "process";
    }
    return "wait";
  }

  if (index === 1) {
    if (!hasGeneratedContent.value) {
      return "wait";
    }
    if (!hasQualityCheck.value) {
      return "process";
    }
    return hasRiskyQuality.value || needsHumanReview.value ? "error" : "success";
  }

  if (index === 2) {
    if (!hasQualityCheck.value) {
      return "wait";
    }
    return hasPublishOptimization.value ? "success" : "process";
  }

  if (index === 3) {
    if (!hasPublishOptimization.value) {
      return "wait";
    }
    return hasPublishFormat.value ? "success" : "process";
  }

  if (hasPublishFormat.value) {
    return "process";
  }
  return "wait";
};

const workflowSteps = computed(() => [
  {
    title: "生成内容",
    label:
      props.detail?.task.status === "failed" || hasFailedItems.value
        ? "生成失败"
        : hasGeneratedContent.value
          ? "生成成功"
          : props.detail?.task.status === "running"
            ? "生成中"
            : "未开始",
    description: hasGeneratedContent.value
      ? `已生成 ${generatedItemsCount.value} 篇文章`
      : "创建任务后生成文章"
  },
  {
    title: "发布检查",
    label: hasQualityCheck.value
      ? hasRiskyQuality.value
        ? "风险较高"
        : needsHumanReview.value
          ? "可进入人工审校"
          : "已完成"
      : hasGeneratedContent.value
        ? "待发布检查"
        : "未开始",
    description: hasQualityCheck.value
      ? (latestQualityGateResult.value?.recommendation ??
        props.qualityCheckResult?.result.publishReadiness.suggestedAction)
      : "检查事实边界、品牌表达和 GEO 结构"
  },
  {
    title: "发布优化",
    label: hasPublishOptimization.value
      ? "已生成发布优化稿"
      : hasQualityCheck.value
        ? "需处理"
        : "未开始",
    description: hasPublishOptimization.value
      ? "优化稿不会覆盖原文，可复制审校"
      : "基于发布检查结果生成更稳妥版本"
  },
  {
    title: "富文本稿",
    label: hasPublishFormat.value
      ? "已生成富文本稿"
      : hasPublishOptimization.value
        ? "需处理"
        : "未开始",
    description: hasPublishFormat.value
      ? "可复制 HTML / Markdown / 纯文本"
      : "将原文或优化稿排版为发布稿"
  },
  {
    title: "人工发布",
    label: hasPublishFormat.value ? "可人工发布" : "未开始",
    description: "复制到外部平台前仍需人工预览"
  }
]);

const currentAction = computed(() => {
  if (!props.detail) {
    return {
      type: "info" as const,
      title: "请选择一个文章任务",
      description: "打开任务详情后可查看生成、审校和发布稿准备进度。"
    };
  }

  if (props.detail.task.status === "failed" || hasFailedItems.value) {
    return {
      type: "error" as const,
      title: "建议先处理生成失败",
      description: "查看失败原因，必要时重试失败任务；重试不会重复生成已成功文章。"
    };
  }

  if (!hasGeneratedContent.value) {
    return {
      type: "info" as const,
      title: "内容仍未生成完成",
      description: "请等待生成结果返回，或刷新详情查看文章状态。"
    };
  }

  if (!hasQualityCheck.value) {
    return {
      type: "warning" as const,
      title: "建议执行发布检查",
      description: "文章已生成，下一步应检查知识库外参数、协议、认证和风险词。"
    };
  }

  if (hasRiskyQuality.value || needsHumanReview.value) {
    return {
      type: "warning" as const,
      title: "建议先人工审校风险项",
      description: "发布检查发现需要复核的内容，先处理风险项，再生成或使用发布优化稿。"
    };
  }

  if (!hasPublishOptimization.value) {
    return {
      type: "info" as const,
      title: "可以生成发布优化版",
      description: "发布检查已完成，可生成更稳妥的发布优化稿；优化稿不会覆盖原文。"
    };
  }

  if (!hasPublishFormat.value) {
    return {
      type: "info" as const,
      title: "建议生成富文本发布稿",
      description: "发布优化版已生成，可以选择优化稿作为来源生成 HTML、Markdown 和纯文本。"
    };
  }

  if (!hasPublishPackage.value) {
    return {
      type: "info" as const,
      title: "建议生成发布稿",
      description: "发布稿会整理标题、摘要、关键词、FAQ、资料依据和人工确认项，便于人工发布。"
    };
  }

  return {
    type: "success" as const,
    title: "可以进入人工发布前预览",
    description: "富文本发布稿已生成，可复制到发布平台；正式发布前仍需人工预览样式和事实边界。"
  };
});

const close = () => {
  emit("update:modelValue", false);
};

const qualityLevelLabelMap: Record<string, string> = {
  good: "质量较好",
  needs_review: "建议复核",
  risky: "风险较高"
};

const qualityLevelTagMap: Record<string, "success" | "warning" | "danger"> = {
  good: "success",
  needs_review: "warning",
  risky: "danger"
};

const riskTypeLabelMap: Record<string, string> = {
  unsupported_claim: "事实边界风险",
  parameter_risk: "参数扩写风险",
  protocol_risk: "协议扩写风险",
  certification_risk: "认证资质风险",
  over_marketing: "过度营销风险",
  brand_expression: "品牌表达风险",
  geo_structure: "GEO 结构风险",
  knowledge_gap: "知识库缺口",
  publish_cleanliness: "发布稿洁净度"
};

const severityLabelMap: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高"
};

const severityTagMap: Record<string, "info" | "warning" | "danger"> = {
  low: "info",
  medium: "warning",
  high: "danger"
};

const publishStatusLabelMap: Record<PublishStatus, string> = {
  publish_ready: "可复制",
  needs_review: "需人工检查",
  not_recommended: "需人工检查"
};

const publishStatusTypeMap: Record<PublishStatus, "success" | "warning" | "danger"> = {
  publish_ready: "success",
  needs_review: "warning",
  not_recommended: "danger"
};

const contentItemStatusLabelMap: Record<string, string> = {
  pending: "待生成",
  running: "生成中",
  draft: "草稿（待审校）",
  succeeded: "生成成功",
  failed: "生成失败",
  cancelled: "已归档"
};

const contentItemStatusTypeMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  pending: "info",
  running: "warning",
  draft: "warning",
  succeeded: "success",
  failed: "danger",
  cancelled: "info"
};

const getRiskTypeLabel = (item: ContentQualityRiskItem) => riskTypeLabelMap[item.type] ?? item.type;
const getQualityLevelLabel = (level: string) => qualityLevelLabelMap[level] ?? level;
const getQualityLevelType = (level: string) => qualityLevelTagMap[level] ?? "info";
const getContentItemStatusLabel = (status: string) => contentItemStatusLabelMap[status] ?? status;
const getContentItemStatusType = (status: string) => contentItemStatusTypeMap[status] ?? "info";
const getPublishStatusLabel = (status?: PublishStatus) =>
  status ? (publishStatusLabelMap[status] ?? status) : "未检查";
const getPublishStatusType = (status?: PublishStatus) =>
  status ? (publishStatusTypeMap[status] ?? "info") : "info";
const getAssistantRiskLevelLabel = () => {
  const level = primaryQualityGateResult.value?.level;

  if (!level) {
    return "未检查";
  }

  return severityLabelMap[level] ?? level;
};
const getAssistantScopeLabel = () => {
  const summary = primaryQualityGateResult.value?.scopeSummary;

  if (!summary) {
    return getKnowledgeScopeSummary();
  }

  if (summary.scopeType === "selected_files") {
    return `指定资料 ${summary.selectedFileCount} 份`;
  }

  if (summary.scopeType === "product_line") {
    return "按产品线";
  }

  return "全部可引用资料";
};
const getAssistantReviewIssues = () => {
  const gate = primaryQualityGateResult.value;

  if (!gate) {
    return ["尚未执行发布检查。"];
  }

  const riskItems = gate.riskItems.map((risk) => {
    if (risk.type === "publish_cleanliness") {
      return risk.reason.includes("编辑口吻") || risk.reason.includes("资料口吻")
        ? "发布稿里还有资料说明或写作提示口吻，请先自动修复或人工修改。"
        : "发布稿里包含内部说明，请先自动修复或人工修改。";
    }

    const reason = risk.reason.includes("知识库未明确") || risk.reason.includes("资料")
      ? "缺少资料依据"
      : risk.reason;

    return `${risk.text}：${reason}`;
  });
  const scanItems = [
    ...gate.forbiddenWordHits.map((hit) => `${hit.word}：风险词需要弱化`),
    ...gate.aiStyleIssues.map((hit) => `${hit.word}：表达需要更自然`),
    ...gate.factBoundaryIssues.map((hit) => `${hit.word}：事实边界需要人工确认`)
  ];

  return [...new Set([...riskItems, ...scanItems])];
};
const getAssistantReviewSuggestions = () => {
  const gate = primaryQualityGateResult.value;
  const suggestions = gate?.riskItems.map((risk) => risk.suggestion).filter(Boolean) ?? [];

  if (suggestions.length > 0) {
    return [...new Set(suggestions)];
  }

  if (primaryArticleItem.value?.publishStatus === "publish_ready") {
    return ["可复制富文本发布稿，发布前快速核对正文和平台格式。"];
  }

  return ["自动修复风险词", "或复制草稿人工修改"];
};
const getScopeSummaryLabel = (item: ContentItem) => {
  const summary = item.qualityGateResult?.scopeSummary;

  if (!summary) {
    return "资料范围：未记录";
  }

  if (summary.scopeType === "selected_files") {
    return `资料范围：指定资料 ${summary.selectedFileCount} 份`;
  }

  if (summary.scopeType === "product_line") {
    return "资料范围：按产品线";
  }

  return "资料范围：全部资料";
};

const platformTitleLabelMap: Record<keyof ArticlePublishPackage["titles"]["platformTitles"], string> = {
  baijiahao: "百家号",
  toutiao: "今日头条",
  zhihu: "知乎",
  xiaohongshu: "小红书",
  douyin: "抖音图文",
  generic: "通用"
};

const getPlatformTitleLabel = (platform: string) =>
  platformTitleLabelMap[platform as keyof ArticlePublishPackage["titles"]["platformTitles"]] ??
  platform;

const getPackageGeneratedAt = (item: ContentItem) =>
  item.publishPackageGeneratedAt ? formatDateTime(item.publishPackageGeneratedAt) : "未记录";

const getPackageArray = (values?: string[]) => values?.filter(Boolean) ?? [];
const hasPackageKeywords = (pack: ArticlePublishPackage) =>
  getPackageArray(pack.keywords.primaryKeywords).length > 0 ||
  getPackageArray(pack.keywords.longTailKeywords).length > 0 ||
  getPackageArray(pack.keywords.platformTags).length > 0;
// 资料来源只展示助理能理解的文件名，内部范围和 chunk 信息放到高级区。
const getAssistantEvidenceNames = () => {
  const names = primaryArticleItem.value?.publishPackage?.evidence
    .map((evidence) => evidence.fileName || evidence.knowledgeBaseName || evidence.productLineName)
    .filter((value): value is string => Boolean(value?.trim())) ?? [];

  if (names.length > 0) {
    return [...new Set(names)];
  }

  return props.detail?.knowledgeBase?.name ? [props.detail.knowledgeBase.name] : [];
};
const scrollToArticleBody = () => {
  articleBodyRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};

const copyOptimizedBody = async () => {
  const text = props.publishOptimizationResult?.result.body;

  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("发布优化版正文已复制。");
  } catch {
    ElMessage.warning("当前浏览器不支持自动复制，请手动选中正文复制。");
  }
};

const handleFormatPublish = (item: ContentItem, payload: FormatContentItemForPublishPayload) => {
  emit("formatPublish", item, payload);
};
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="86%"
    :with-header="false"
    class="content-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="content-detail">
      <div class="content-detail-header">
        <div class="content-detail-header__copy">
          <el-tag class="content-detail-header__tag" type="success" effect="plain">
            文章预览
          </el-tag>
          <h2>{{ primaryArticleItem?.title ?? getDisplayTaskName() }}</h2>
          <p>
            先看能不能发，再看正文和资料来源；负责人信息已收进高级信息。
          </p>
        </div>
        <div class="content-detail-actions">
          <el-button :loading="loading" @click="emit('refresh')">刷新详情</el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-alert
        v-if="hasFailedItems"
        title="重试不会重复生成已成功文章，只会处理失败或缺失的文章结果。"
        type="info"
        :closable="false"
        show-icon
        class="dialog-alert"
      />

      <el-skeleton v-if="loading && !detail" :rows="8" animated />

      <template v-else-if="detail">
        <el-alert
          v-if="detail.task.status === 'failed' || hasFailedItems"
          :title="failureAlertTitle"
          :description="failureAlertDescription"
          type="error"
          :closable="false"
          show-icon
          class="dialog-alert"
        />

        <section class="assistant-reader-shell">
          <section
            class="assistant-status-card"
            :class="`assistant-status-card--${assistantStatusCard.type}`"
          >
            <div>
              <el-tag :type="assistantStatusCard.type" effect="plain">
                {{ primaryArticleItem?.publishStatus === "publish_ready" ? "可复制" : "需人工检查" }}
              </el-tag>
              <h3>{{ assistantStatusCard.title }}</h3>
              <p>{{ assistantStatusCard.description }}</p>
            </div>
            <div class="assistant-status-actions">
              <template v-if="primaryArticleItem && isPrimaryArticleCopyable">
                <el-button
                  type="success"
                  :loading="publishPackageExportingIds?.includes(primaryArticleItem.id)"
                  @click="emit('copyPublishPackage', primaryArticleItem)"
                >
                  复制富文本
                </el-button>
                <el-button @click="scrollToArticleBody">查看正文</el-button>
                <el-button @click="close">返回列表</el-button>
              </template>
              <template v-else-if="primaryArticleItem && isPrimaryArticleNeedsReview">
                <el-button
                  v-if="canManageActions"
                  type="warning"
                  :loading="riskFixingIds?.includes(primaryArticleItem.id)"
                  @click="emit('fixRiskWords', primaryArticleItem)"
                >
                  自动修复风险词
                </el-button>
                <el-button
                  :loading="publishPackageExportingIds?.includes(primaryArticleItem.id)"
                  @click="emit('copyDraft', primaryArticleItem)"
                >
                  复制草稿继续修改
                </el-button>
                <el-button v-if="canManageActions" type="warning" plain @click="emit('regenerate')">
                  重新生成文章
                </el-button>
                <el-button @click="close">返回列表</el-button>
              </template>
              <el-button v-else @click="close">返回列表</el-button>
            </div>
          </section>

          <section ref="articleBodyRef" class="assistant-article-panel">
            <div class="section-heading">
              <div>
                <p class="section-kicker">发布稿预览</p>
                <h3>可复制发布稿</h3>
                <p>这里展示的是复制到发布平台的最终稿。</p>
              </div>
              <el-button
                v-if="primaryArticleItem?.publishStatus === 'publish_ready'"
                type="success"
                :loading="publishPackageExportingIds?.includes(primaryArticleItem.id)"
                @click="emit('copyPublishPackage', primaryArticleItem)"
              >
                复制富文本
              </el-button>
            </div>
            <div class="assistant-article-body">
              <template v-if="primaryArticleItem && primaryArticleBlocks.length > 0">
                <!-- eslint-disable vue/no-v-html -->
                <template v-for="(block, index) in primaryArticleBlocks" :key="`${block.type}-${index}`">
                  <h4
                    v-if="block.type === 'heading'"
                    :class="`assistant-article-heading assistant-article-heading--${block.level}`"
                    v-html="block.html"
                  />
                  <p v-else-if="block.type === 'paragraph'" v-html="block.html" />
                  <ul v-else class="assistant-article-body-list">
                    <li v-for="item in block.items" :key="item" v-html="item" />
                  </ul>
                </template>
                <!-- eslint-enable vue/no-v-html -->
              </template>
              <p v-else-if="isPrimaryArticlePreviewLoading" class="assistant-muted-text">
                发布稿预览加载中。
              </p>
              <p v-else class="assistant-muted-text">
                暂无可预览发布稿，请刷新详情或请负责人检查发布稿导出。
              </p>
            </div>
          </section>

          <section class="assistant-simple-section">
            <div class="section-heading">
              <div>
                <p class="section-kicker">发布检查</p>
                <h3>
                  发布检查：{{
                    primaryArticleItem?.publishStatus === "publish_ready" ? "已通过" : "需人工检查"
                  }}
                </h3>
              </div>
            </div>
            <div class="assistant-check-grid">
              <div>
                <span>风险等级</span>
                <strong>{{ getAssistantRiskLevelLabel() }}</strong>
              </div>
              <div>
                <span>资料依据</span>
                <strong>{{ getAssistantScopeLabel() }}</strong>
              </div>
              <div>
                <span>当前状态</span>
                <strong>{{ getPublishStatusLabel(primaryArticleItem?.publishStatus) }}</strong>
              </div>
            </div>
            <template v-if="primaryArticleItem?.publishStatus !== 'publish_ready'">
              <h4>发现问题</h4>
              <ul class="assistant-plain-list">
                <li v-for="issue in getAssistantReviewIssues()" :key="issue">{{ issue }}</li>
              </ul>
              <h4>建议</h4>
              <ul class="assistant-plain-list">
                <li v-for="suggestion in getAssistantReviewSuggestions()" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </template>
            <p v-else class="assistant-muted-text">
              发布检查未发现阻断项，可以复制富文本发布稿。
            </p>
          </section>

          <section class="assistant-simple-section">
            <div class="section-heading">
              <div>
                <p class="section-kicker">资料依据</p>
                <h3>资料来源</h3>
              </div>
            </div>
            <ul v-if="getAssistantEvidenceNames().length > 0" class="assistant-source-list">
              <li v-for="name in getAssistantEvidenceNames()" :key="name">{{ name }}</li>
            </ul>
            <p v-else class="assistant-muted-text">
              暂无可直接展示的资料名称，请负责人到高级信息中核对。
            </p>
          </section>
        </section>

        <el-collapse class="assistant-advanced-collapse">
          <el-collapse-item name="advanced">
            <template #title>
              <span class="technical-collapse-title">高级信息（负责人查看）</span>
            </template>

            <el-alert
              :title="currentAction.title"
              :description="currentAction.description"
              :type="currentAction.type"
              :closable="false"
              show-icon
              class="dialog-alert content-current-action-alert"
            />

            <div class="advanced-task-actions">
              <el-button
                v-if="canRetry"
                type="warning"
                :loading="retrying"
                @click="emit('retry')"
              >
                重试失败任务
              </el-button>
              <el-button v-if="canArchive" plain :loading="archiving" @click="emit('archive')">
                归档任务
              </el-button>
            </div>

            <el-card class="content-overview-card" shadow="never">
              <template #header>
                <div class="quality-card-header">
                  <div>
                    <span>任务概览</span>
                    <strong>把技术字段收起来，先看业务链路是否完整</strong>
                  </div>
                </div>
              </template>
              <div class="content-overview-grid">
                <div>
                  <span>文章主题</span>
                  <strong>{{
                    detail.prompts.map((prompt) => prompt.promptText).join("、") || "--"
                  }}</strong>
                </div>
                <div>
                  <span>内容类型</span>
                  <strong>{{
                    generationTypeLabelMap[detail.task.generationType] ?? detail.task.generationType
                  }}</strong>
                </div>
                <div>
                  <span>任务状态</span>
                  <ContentTaskStatusTag :status="detail.task.status" />
                </div>
                <div>
                  <span>内容数量</span>
                  <strong>{{ generatedItemsCount }} / {{ contentItemsCount }} 个已生成</strong>
                </div>
                <div>
                  <span>知识库</span>
                  <strong>{{ detail.knowledgeBase?.name ?? "未选择" }}</strong>
                </div>
                <div>
                  <span>资料范围</span>
                  <strong>{{ getKnowledgeScopeSummary() }}</strong>
                </div>
                <div>
                  <span>创建时间</span>
                  <strong>{{ formatDateTime(detail.task.createdAt) }}</strong>
                </div>
              </div>
            </el-card>

            <el-collapse class="content-flow-collapse">
              <el-collapse-item name="workflow">
                <template #title>
                  <span class="technical-collapse-title">内容发布准备流程（默认折叠）</span>
                </template>
                <el-card class="content-flow-card" shadow="never">
                  <template #header>
                    <div class="quality-card-header">
                      <div>
                        <span>内容发布准备流程</span>
                        <strong>生成文章 → 发布检查 → 发布优化 → 富文本稿 → 人工发布</strong>
                      </div>
                    </div>
                  </template>

                  <el-steps class="content-flow-steps" align-center>
                    <el-step
                      v-for="(step, index) in workflowSteps"
                      :key="step.title"
                      :description="step.label"
                      :status="getWorkflowStepStatus(index)"
                      :title="step.title"
                    />
                  </el-steps>

                  <div class="content-flow-notes">
                    <div v-for="step in workflowSteps" :key="`${step.title}-note`">
                      <strong>{{ step.title }}</strong>
                      <span>{{ step.description }}</span>
                    </div>
                  </div>
                </el-card>
              </el-collapse-item>
            </el-collapse>

            <section class="content-preview-section">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">原始生成稿</p>
                  <h3>原始标题和正文</h3>
                  <p>负责人查看原始 content body；助理默认看到的是上方发布稿预览。</p>
                </div>
              </div>

              <div v-if="detail.items.length > 0" class="content-preview-list">
                <article v-for="item in detail.items" :key="item.id" class="content-preview-card">
                  <div class="content-preview-card__header">
                    <div>
                      <span>{{ findPromptText(item.geoPromptId) }}</span>
                      <h4>{{ item.title }}</h4>
                    </div>
                    <el-tag :type="getContentItemStatusType(item.status)" effect="plain">
                      {{ getContentItemStatusLabel(item.status) }}
                    </el-tag>
                  </div>
                  <p v-if="item.errorMessage" class="content-preview-card__error">
                    {{ item.errorMessage }}
                  </p>
                  <p class="content-preview-card__body">
                    {{ isContentExpanded(item.id) ? getDisplayContentText(item.body) : getContentPreview(item.body) }}
                  </p>
                  <div class="content-preview-card__footer">
                    <span>建议发布位置：{{ formatOptional(item.suggestedPublishChannel) }}</span>
                    <el-button
                      v-if="item.publishStatus === 'publish_ready'"
                      text
                      type="success"
                      :loading="publishPackageExportingIds?.includes(item.id)"
                      @click="emit('copyPublishPackage', item)"
                    >
                      复制富文本
                    </el-button>
                    <el-button
                      v-else-if="canManageActions"
                      text
                      type="warning"
                      :loading="riskFixingIds?.includes(item.id)"
                      @click="emit('fixRiskWords', item)"
                    >
                      自动修复风险词
                    </el-button>
                    <el-button text type="primary" @click="toggleContentPreview(item.id)">
                      {{ isContentExpanded(item.id) ? "收起正文" : "展开阅读全文" }}
                    </el-button>
                  </div>
                </article>
              </div>
              <el-empty v-else description="暂无文章内容" />
            </section>

            <section class="content-items-section">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">高级操作</p>
                  <h3>编辑、检查、优化和导出入口</h3>
                  <p>查看入口始终可用；编辑、检查、优化和导出会按当前账号权限展示。</p>
                </div>
              </div>
              <ContentItemTable
                :items="detail.items"
                :prompts="detail.prompts"
                :can-manage-actions="canManageActions"
                :exporting-ids="exportingIds"
                :deleting-ids="deletingIds"
                :quality-checking-ids="qualityCheckingIds"
                :optimizing-ids="optimizingIds"
                @view="emit('view', $event)"
                @edit="emit('edit', $event)"
                @export="emit('export', $event)"
                @delete="emit('delete', $event)"
                @quality-check="emit('qualityCheck', $event)"
                @optimize="emit('optimize', $event)"
              />
            </section>

            <section class="content-publish-package-section">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">发布稿</p>
                  <h3>发布稿、资料依据和高级导出</h3>
                  <p>发布稿不会调用 AI，也不会自动发布，只用于人工复制和导出。</p>
                </div>
              </div>

              <div v-if="publishPackageItems.length > 0" class="publish-package-list">
                <article
                  v-for="item in publishPackageItems"
                  :key="`publish-package-${item.id}`"
                  class="publish-package-card"
                >
                  <div class="publish-package-card__header">
                    <div>
                      <span>{{ item.title }}</span>
                      <strong>
                        {{ item.publishPackage ? "已生成发布稿" : "尚未生成发布稿" }}
                      </strong>
                    </div>
                    <div class="publish-package-card__actions">
                      <el-tag :type="getPublishStatusType(item.publishStatus)" effect="plain">
                        {{ getPublishStatusLabel(item.publishStatus) }}
                      </el-tag>
                      <el-button
                        v-if="canManageActions"
                        type="primary"
                        plain
                        :loading="publishPackageGeneratingIds?.includes(item.id)"
                        @click="emit('generatePublishPackage', item)"
                      >
                        {{ item.publishPackage ? "重新生成发布稿" : "生成发布稿" }}
                      </el-button>
                    </div>
                  </div>

                  <template v-if="item.publishPackage">
                    <div class="publish-package-actions">
                      <el-button
                        text
                        type="primary"
                        :loading="publishPackageExportingIds?.includes(item.id)"
                        @click="emit('copyPublishPackage', item)"
                      >
                        复制富文本
                      </el-button>
                      <el-button
                        text
                        type="primary"
                        :loading="publishPackageExportingIds?.includes(item.id)"
                        @click="emit('exportPublishPackage', item, 'review-markdown')"
                      >
                        导出评审稿
                      </el-button>
                      <el-button
                        text
                        type="primary"
                        :loading="publishPackageExportingIds?.includes(item.id)"
                        @click="emit('exportPublishPackage', item, 'publish-markdown')"
                      >
                        导出发布稿
                      </el-button>
                      <el-button
                        text
                        type="primary"
                        :loading="publishPackageExportingIds?.includes(item.id)"
                        @click="emit('exportPublishPackage', item, 'package-txt')"
                      >
                        导出发布稿 TXT
                      </el-button>
                    </div>

                    <div class="publish-package-grid">
                      <div>
                        <span>短标题</span>
                        <strong>{{ item.publishPackage.titles.shortTitle || "待人工补充" }}</strong>
                      </div>
                      <div>
                        <span>标准标题</span>
                        <strong>{{ item.publishPackage.titles.standardTitle || "待人工补充" }}</strong>
                      </div>
                      <div>
                        <span>搜索标题</span>
                        <strong>{{ item.publishPackage.titles.searchTitle || "待人工补充" }}</strong>
                      </div>
                      <div>
                        <span>生成时间</span>
                        <strong>{{ getPackageGeneratedAt(item) }}</strong>
                      </div>
                    </div>

                    <div class="publish-package-block">
                      <h4>平台标题建议</h4>
                      <div class="publish-package-tags">
                        <el-tag
                          v-for="(value, platform) in item.publishPackage.titles.platformTitles"
                          :key="platform"
                          effect="plain"
                        >
                          {{ getPlatformTitleLabel(platform) }}：{{ value || "待人工补充" }}
                        </el-tag>
                      </div>
                    </div>

                    <div class="publish-package-block">
                      <h4>摘要</h4>
                      <p>{{ item.publishPackage.summary || "待人工补充" }}</p>
                    </div>

                    <div class="publish-package-columns">
                      <div>
                        <h4>关键词</h4>
                        <div class="publish-package-tags">
                          <el-tag
                            v-for="keyword in [
                              ...getPackageArray(item.publishPackage.keywords.primaryKeywords),
                              ...getPackageArray(item.publishPackage.keywords.longTailKeywords),
                              ...getPackageArray(item.publishPackage.keywords.platformTags)
                            ]"
                            :key="keyword"
                            effect="plain"
                          >
                            {{ keyword }}
                          </el-tag>
                          <span v-if="!hasPackageKeywords(item.publishPackage)">待人工补充</span>
                        </div>
                      </div>
                      <div>
                        <h4>FAQ</h4>
                        <ul v-if="item.publishPackage.faqs.length > 0">
                          <li v-for="faq in item.publishPackage.faqs" :key="faq.question">
                            <strong>{{ faq.question }}</strong>
                            <span>{{ faq.answer }}</span>
                          </li>
                        </ul>
                        <p v-else>待人工补充 FAQ</p>
                      </div>
                    </div>

                    <div class="publish-package-columns">
                      <div>
                        <h4>资料依据</h4>
                        <ul v-if="item.publishPackage.evidence.length > 0">
                          <li v-for="evidence in item.publishPackage.evidence" :key="`${evidence.fileName}-${evidence.sourceNote}`">
                            {{
                              [
                                evidence.knowledgeBaseName ? `知识库：${evidence.knowledgeBaseName}` : "",
                                evidence.fileName ? `资料：${evidence.fileName}` : "",
                                evidence.productLineName ? `产品线：${evidence.productLineName}` : "",
                                evidence.scopeType ? `范围：${evidence.scopeType}` : "",
                                evidence.sourceNote ? `说明：${evidence.sourceNote}` : ""
                              ].filter(Boolean).join("；")
                            }}
                          </li>
                        </ul>
                        <p v-else>暂无可自动确认的资料依据，发布前需人工核对。</p>
                      </div>
                      <div>
                        <h4>风险提示 / 人工确认</h4>
                        <ul>
                          <li
                            v-for="tip in [
                              ...item.publishPackage.riskTips,
                              ...item.publishPackage.manualCheckItems
                            ]"
                            :key="tip"
                          >
                            {{ tip }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </template>
                  <el-empty v-else description="尚未生成发布稿" />
                </article>
              </div>
              <el-empty v-else description="暂无可生成发布稿的文章" />
            </section>

            <el-collapse class="content-technical-collapse">
              <el-collapse-item name="technical">
                <template #title>
                  <span class="technical-collapse-title">技术信息与上下文（默认折叠）</span>
                </template>
                <el-descriptions :column="3" border class="content-detail-summary">
                  <el-descriptions-item label="文章任务 ID">
                    {{ detail.task.id }}
                  </el-descriptions-item>
                  <el-descriptions-item label="任务名称">
                    {{ detail.task.name }}
                  </el-descriptions-item>
                  <el-descriptions-item label="生成类型">
                    <ContentGenerationTypeTag :type="detail.task.generationType" />
                  </el-descriptions-item>
                  <el-descriptions-item label="目标模型">
                    {{ formatOptional(detail.task.targetModel) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Provider 原始字段">
                    {{ formatOptional(detail.task.provider) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Model 原始字段">
                    {{ formatOptional(detail.task.model) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="指令模板">
                    {{ detail.instructionTemplate?.name ?? "--" }}
                  </el-descriptions-item>
                  <el-descriptions-item label="知识库">
                    {{ detail.knowledgeBase?.name ?? "--" }}
                  </el-descriptions-item>
                  <el-descriptions-item label="更新时间">
                    {{ formatDateTime(detail.task.updatedAt) }}
                  </el-descriptions-item>
                </el-descriptions>

                <div class="content-detail-grid content-detail-grid--technical">
                  <el-card shadow="never">
                    <template #header>关联 GEO 提示词</template>
                    <div v-if="detail.prompts.length > 0" class="related-list">
                      <div v-for="prompt in detail.prompts" :key="prompt.id" class="related-item">
                        <strong>{{ prompt.promptText }}</strong>
                        <GeoPromptTypeTag :type="prompt.type" />
                        <span>{{ formatOptional(prompt.productLine) }}</span>
                      </div>
                    </div>
                    <el-empty v-else description="暂无关联提示词" />
                  </el-card>

                  <el-card shadow="never">
                    <template #header>知识库与指令上下文</template>
                    <p>
                      知识库：{{ detail.knowledgeBase?.name ?? "未选择" }} /
                      {{ formatOptional(detail.knowledgeBase?.productLine) }}
                    </p>
                    <p>
                      指令：{{ detail.instructionTemplate?.name ?? "未选择" }} /
                      {{
                        detail.instructionTemplate
                          ? (instructionTypeLabelMap[detail.instructionTemplate.instructionType] ??
                            detail.instructionTemplate.instructionType)
                          : "--"
                      }}
                    </p>
                    <p>
                      内容类型：{{
                        detail.instructionTemplate
                          ? (contentTypeLabelMap[detail.instructionTemplate.contentType] ??
                            detail.instructionTemplate.contentType)
                          : (generationTypeLabelMap[detail.task.generationType] ??
                            detail.task.generationType)
                      }}
                    </p>
                  </el-card>

                  <el-card shadow="never">
                    <template #header>AI 调用日志</template>
                    <div v-if="detail.aiCallLogs.length > 0" class="related-list compact">
                      <div v-for="log in detail.aiCallLogs" :key="log.id" class="related-item">
                        <strong>{{ formatProviderModel(log.provider, log.model) }}</strong>
                        <span>{{ aiCallPurposeLabelMap[log.purpose] ?? log.purpose }}</span>
                        <el-tag :type="log.status === 'failed' ? 'danger' : 'success'" effect="plain">
                          {{ aiCallStatusLabelMap[log.status] ?? log.status }}
                        </el-tag>
                        <span>{{ formatDateTime(log.createdAt) }}</span>
                      </div>
                    </div>
                    <el-empty v-else description="暂无 AI 调用日志" />
                  </el-card>
                </div>
              </el-collapse-item>
            </el-collapse>

            <section class="content-quality-section">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">发布前检查</p>
                  <h3>发布检查与发布优化版</h3>
                  <p>
                    发布检查会识别知识库外参数、协议、认证、过度承诺、品牌表达和 GEO
                    结构风险；生成发布优化版不会自动覆盖原文。
                  </p>
                </div>
              </div>

              <el-alert
                title="发布检查和发布优化用于辅助人工审校，生成结果不会自动覆盖原文。"
                type="info"
                :closable="false"
                show-icon
                class="dialog-alert"
              />

              <el-card
                v-if="persistedQualityGateItems.length > 0"
                shadow="never"
                class="quality-gate-card"
              >
                <template #header>
                  <div class="quality-card-header">
                    <div>
                      <span>发布质量状态</span>
                      <strong>已保存的文章发布检查结果</strong>
                    </div>
                  </div>
                </template>

                <div class="quality-gate-list">
                  <article
                    v-for="{ item, gate } in persistedQualityGateItems"
                    :key="item.id"
                    class="quality-gate-item"
                  >
                    <div class="quality-gate-item__header">
                      <div>
                        <strong>{{ item.title }}</strong>
                        <span>
                          {{ item.qualityCheckedAt ? formatDateTime(item.qualityCheckedAt) : "检查时间未记录" }}
                        </span>
                      </div>
                      <div class="quality-gate-item__actions">
                        <el-tag :type="getPublishStatusType(gate.publishStatus)" effect="plain">
                          {{ getPublishStatusLabel(gate.publishStatus) }}
                        </el-tag>
                        <el-button
                          v-if="canManageActions"
                          text
                          type="primary"
                          :loading="qualityCheckingIds?.includes(item.id)"
                          @click="emit('qualityCheck', item)"
                        >
                          重新检查
                        </el-button>
                      </div>
                    </div>

                    <div class="quality-summary-grid">
                      <div>
                        <span>评分</span>
                        <strong>{{ gate.score }}</strong>
                      </div>
                      <div>
                        <span>风险等级</span>
                        <strong>{{ severityLabelMap[gate.level] ?? gate.level }}</strong>
                      </div>
                      <div>
                        <span>资料范围</span>
                        <strong>{{ getScopeSummaryLabel(item) }}</strong>
                      </div>
                    </div>

                    <p class="quality-summary-text">{{ gate.recommendation }}</p>

                    <div class="quality-columns">
                      <div>
                        <h4>风险项 / 人工确认项</h4>
                        <ul v-if="gate.manualReviewItems.length > 0 || gate.riskItems.length > 0">
                          <li v-for="reviewItem in gate.manualReviewItems" :key="reviewItem">
                            {{ reviewItem }}
                          </li>
                          <li
                            v-for="risk in gate.riskItems"
                            :key="`${risk.type}-${risk.text}`"
                          >
                            {{ getRiskTypeLabel(risk) }}：{{ risk.text }}，{{ risk.suggestion }}
                          </li>
                        </ul>
                        <el-empty v-else description="暂无需要人工确认的风险项" />
                      </div>
                      <div>
                        <h4>规则扫描</h4>
                        <div class="positive-list">
                          <el-tag
                            v-if="gate.forbiddenWordHits.length > 0"
                            type="danger"
                            effect="plain"
                          >
                            风险词 {{ gate.forbiddenWordHits.length }} 处
                          </el-tag>
                          <el-tag
                            v-if="gate.aiStyleIssues.length > 0"
                            type="warning"
                            effect="plain"
                          >
                            AI 化表达 {{ gate.aiStyleIssues.length }} 处
                          </el-tag>
                          <el-tag
                            v-if="gate.factBoundaryIssues.length > 0"
                            type="warning"
                            effect="plain"
                          >
                            事实边界 {{ gate.factBoundaryIssues.length }} 处
                          </el-tag>
                          <el-tag
                            v-if="
                              gate.forbiddenWordHits.length === 0 &&
                                gate.aiStyleIssues.length === 0 &&
                                gate.factBoundaryIssues.length === 0
                            "
                            type="success"
                            effect="plain"
                          >
                            规则扫描未命中明显问题
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </el-card>

              <el-alert
                v-if="qualityCheckError"
                :title="qualityCheckError"
                type="error"
                :closable="false"
                show-icon
                class="dialog-alert"
              />

              <el-card v-if="qualityCheckResult" shadow="never" class="quality-result-card">
                <template #header>
                  <div class="quality-card-header">
                    <div>
                      <span>发布检查结果</span>
                      <strong>{{ qualityCheckResult.itemTitle }}</strong>
                    </div>
                    <el-tag :type="getQualityLevelType(qualityCheckResult.result.level)" effect="plain">
                      {{ getQualityLevelLabel(qualityCheckResult.result.level) }}
                    </el-tag>
                  </div>
                </template>

                <div class="quality-summary-grid">
                  <div>
                    <span>评分</span>
                    <strong>{{ qualityCheckResult.result.score }}</strong>
                  </div>
                  <div>
                    <span>发布建议</span>
                    <strong>{{ qualityCheckResult.result.publishReadiness.suggestedAction }}</strong>
                  </div>
                  <div>
                    <span>是否需人工复核</span>
                    <strong>{{
                      qualityCheckResult.result.publishReadiness.needsHumanReview ? "需要" : "不需要"
                    }}</strong>
                  </div>
                </div>

                <p class="quality-summary-text">{{ qualityCheckResult.result.summary }}</p>

                <div class="quality-columns">
                  <div>
                    <h4>风险项</h4>
                    <div v-if="qualityCheckResult.result.riskItems.length > 0" class="risk-list">
                      <div
                        v-for="(risk, index) in qualityCheckResult.result.riskItems"
                        :key="`${risk.type}-${risk.text}-${index}`"
                        class="risk-item"
                      >
                        <div class="risk-item__header">
                          <el-tag type="danger" effect="plain">{{ getRiskTypeLabel(risk) }}</el-tag>
                          <el-tag :type="severityTagMap[risk.severity] ?? 'info'" effect="plain">
                            {{ severityLabelMap[risk.severity] ?? risk.severity }}风险
                          </el-tag>
                        </div>
                        <strong>{{ risk.text }}</strong>
                        <p>{{ risk.reason }}</p>
                        <small>{{ risk.suggestion }}</small>
                      </div>
                    </div>
                    <el-empty v-else description="未发现明显高风险项" />
                  </div>

                  <div>
                    <h4>正向项</h4>
                    <div
                      v-if="qualityCheckResult.result.positiveItems.length > 0"
                      class="positive-list"
                    >
                      <el-tag
                        v-for="item in qualityCheckResult.result.positiveItems"
                        :key="item"
                        type="success"
                        effect="plain"
                      >
                        {{ item }}
                      </el-tag>
                    </div>
                    <el-empty v-else description="暂无明显正向项" />
                  </div>
                </div>
              </el-card>
              <el-card v-else shadow="never" class="review-empty-card">
                <div>
                  <el-tag type="warning" effect="plain">待发布检查</el-tag>
                  <h4>尚未进行发布检查</h4>
                  <p>
                    文章已生成时，建议先执行发布检查。检查完成后会保存发布检查状态，刷新页面后仍可查看。
                  </p>
                </div>
              </el-card>

              <el-alert
                v-if="publishOptimizationError"
                :title="publishOptimizationError"
                type="error"
                :closable="false"
                show-icon
                class="dialog-alert"
              />

              <el-card
                v-if="publishOptimizationResult"
                shadow="never"
                class="publish-optimization-card"
              >
                <template #header>
                  <div class="quality-card-header">
                    <div>
                      <span>发布优化版</span>
                      <strong>{{ publishOptimizationResult.itemTitle }}</strong>
                    </div>
                    <el-button text type="primary" @click="copyOptimizedBody">复制正文</el-button>
                  </div>
                </template>

                <h4>{{ publishOptimizationResult.result.title }}</h4>
                <pre class="optimized-body">{{ publishOptimizationResult.result.body }}</pre>

                <div class="quality-columns">
                  <div>
                    <h4>修改点</h4>
                    <ul>
                      <li v-for="item in publishOptimizationResult.result.changes" :key="item">
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4>注意事项</h4>
                    <ul>
                      <li v-for="item in publishOptimizationResult.result.warnings" :key="item">
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                </div>
              </el-card>
              <el-card v-else shadow="never" class="review-empty-card">
                <div>
                  <el-tag :type="hasQualityCheck ? 'warning' : 'info'" effect="plain">
                    {{ hasQualityCheck ? "待发布优化" : "未开始" }}
                  </el-tag>
                  <h4>发布优化版不会覆盖原文</h4>
                  <p>
                    建议在发布检查后生成发布优化版，用于弱化事实风险、保留 GEO
                    结构，并作为富文本稿的优先来源。
                  </p>
                </div>
              </el-card>

              <PublishFormatPanel
                :items="detail.items"
                :publish-optimization-result="publishOptimizationResult"
                :publish-format-result="publishFormatResult"
                :publish-format-error="publishFormatError"
                :formatting-ids="formattingIds"
                @format="handleFormatPublish"
              />
            </section>
          </el-collapse-item>
        </el-collapse>
      </template>

      <el-empty v-else description="请选择一个文章任务查看详情" />
    </section>
  </el-drawer>
</template>

<style scoped>
.assistant-reader-shell {
  display: grid;
  gap: 16px;
}

.assistant-status-card,
.assistant-article-panel,
.assistant-simple-section,
.assistant-advanced-collapse {
  border: 1px solid #e3e7ee;
  border-radius: 10px;
  background: #ffffff;
}

.assistant-status-card {
  align-items: flex-start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 20px;
}

.assistant-status-card--success {
  border-color: #c9e8d0;
  background: #f6fff8;
}

.assistant-status-card--warning {
  border-color: #efd8aa;
  background: #fffaf0;
}

.assistant-status-card--info {
  border-color: #d7e4f4;
  background: #f7fbff;
}

.assistant-status-card h3,
.assistant-status-card p {
  margin: 0;
}

.assistant-status-card h3 {
  color: #101828;
  font-size: 22px;
  line-height: 1.35;
  margin-top: 10px;
}

.assistant-status-card p,
.assistant-muted-text {
  color: #667085;
  line-height: 1.75;
}

.assistant-status-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.assistant-article-panel,
.assistant-simple-section {
  padding: 20px;
}

.assistant-article-body {
  background: #ffffff;
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  color: #1f2937;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.9;
  margin: 14px 0 0;
  max-height: none;
  overflow: visible;
  padding: 24px;
}

.assistant-article-body :deep(strong) {
  color: #101828;
  font-weight: 850;
}

.assistant-article-body :deep(code) {
  background: #f2f4f7;
  border-radius: 4px;
  color: #344054;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  padding: 1px 5px;
}

.assistant-article-body p,
.assistant-article-body ul,
.assistant-article-heading {
  margin: 0;
}

.assistant-article-body p + p,
.assistant-article-body p + ul,
.assistant-article-body ul + p,
.assistant-article-body ul + .assistant-article-heading,
.assistant-article-heading + p,
.assistant-article-heading + ul {
  margin-top: 14px;
}

.assistant-article-heading {
  color: #101828;
  font-weight: 900;
  line-height: 1.45;
}

.assistant-article-heading--1,
.assistant-article-heading--2 {
  font-size: 22px;
}

.assistant-article-heading--3 {
  font-size: 19px;
}

.assistant-article-heading--4 {
  font-size: 17px;
}

.assistant-article-body-list {
  display: grid;
  gap: 8px;
  padding-left: 22px;
}

.assistant-check-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 12px 0 16px;
}

.assistant-check-grid > div {
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  background: #fbfcfe;
  display: grid;
  gap: 6px;
  padding: 12px;
}

.assistant-check-grid span {
  color: #667085;
  font-size: 13px;
}

.assistant-check-grid strong {
  color: #101828;
  font-size: 18px;
}

.assistant-simple-section h4 {
  color: #101828;
  margin: 14px 0 8px;
}

.assistant-plain-list,
.assistant-source-list {
  color: #344054;
  line-height: 1.75;
  margin: 0;
  padding-left: 20px;
}

.assistant-source-list {
  font-size: 15px;
}

.assistant-advanced-collapse {
  overflow: hidden;
}

.assistant-advanced-collapse :deep(.el-collapse-item__header) {
  color: #101828;
  font-weight: 800;
  padding: 0 18px;
}

.assistant-advanced-collapse :deep(.el-collapse-item__content) {
  padding: 0 18px 18px;
}

.advanced-task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.content-quality-section {
  margin-top: 20px;
}

.quality-gate-card {
  margin-bottom: 16px;
}

.quality-gate-list {
  display: grid;
  gap: 14px;
}

.quality-gate-item {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  display: grid;
  gap: 14px;
  padding: 14px;
}

.quality-gate-item__header,
.quality-gate-item__actions {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.quality-gate-item__header > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.quality-gate-item__header span {
  color: var(--geo-text-secondary);
  font-size: 12px;
}

.content-flow-card,
.content-overview-card,
.content-preview-section,
.content-flow-collapse,
.content-technical-collapse {
  margin-top: 16px;
}

.content-flow-steps {
  margin: 6px 0 20px;
}

.content-flow-notes {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.content-flow-notes > div {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: var(--geo-surface-muted);
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
}

.content-flow-notes strong {
  color: var(--geo-ink);
  font-size: 13px;
}

.content-flow-notes span {
  color: var(--geo-muted);
  font-size: 12px;
  line-height: 1.6;
}

.content-overview-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.content-overview-grid > div {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px;
}

.content-overview-grid span {
  color: var(--geo-muted);
  font-size: 13px;
}

.content-overview-grid strong {
  color: var(--geo-ink);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.content-preview-section {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
}

.content-preview-list {
  display: grid;
  gap: 12px;
}

.content-preview-card {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: var(--geo-surface-muted);
  display: grid;
  gap: 12px;
  padding: 16px;
}

.content-preview-card__header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.content-preview-card__header div {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.content-preview-card__header span,
.content-preview-card__footer span {
  color: var(--geo-muted);
  font-size: 13px;
}

.content-preview-card__header h4 {
  color: var(--geo-ink);
  font-size: 16px;
  line-height: 1.45;
  margin: 0;
}

.content-preview-card__body {
  color: var(--geo-ink);
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap;
}

.content-preview-card__error {
  border-left: 3px solid var(--geo-danger);
  color: var(--geo-danger);
  line-height: 1.7;
  margin: 0;
  padding-left: 10px;
}

.content-preview-card__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
}

.content-technical-collapse {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.content-flow-collapse {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.content-flow-collapse :deep(.el-collapse-item__header) {
  color: var(--geo-ink);
  font-weight: 700;
  padding: 0 16px;
}

.content-flow-collapse :deep(.el-collapse-item__content) {
  padding: 0 16px 16px;
}

.content-technical-collapse :deep(.el-collapse-item__header) {
  color: var(--geo-ink);
  font-weight: 700;
  padding: 0 16px;
}

.content-technical-collapse :deep(.el-collapse-item__content) {
  padding: 0 16px 16px;
}

.technical-collapse-title {
  font-size: 14px;
}

.content-detail-grid--technical {
  margin-top: 14px;
}

.review-empty-card {
  margin-top: 16px;
}

.review-empty-card div {
  display: grid;
  gap: 8px;
}

.review-empty-card h4,
.review-empty-card p {
  margin: 0;
}

.review-empty-card h4 {
  color: var(--geo-ink);
}

.review-empty-card p {
  color: var(--geo-muted);
  line-height: 1.7;
}

.quality-result-card,
.publish-optimization-card {
  margin-top: 16px;
}

.quality-card-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.quality-card-header div {
  display: grid;
  gap: 4px;
}

.quality-card-header span {
  color: var(--geo-text-secondary);
  font-size: 13px;
}

.quality-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.quality-summary-grid > div {
  background: var(--geo-bg-soft);
  border: 1px solid var(--geo-border);
  border-radius: 10px;
  display: grid;
  gap: 6px;
  padding: 14px;
}

.quality-summary-grid span {
  color: var(--geo-text-secondary);
  font-size: 13px;
}

.quality-summary-grid strong {
  color: var(--geo-text);
  font-size: 20px;
}

.quality-summary-text {
  color: var(--geo-text-secondary);
  line-height: 1.75;
}

.quality-columns {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  margin-top: 16px;
}

.risk-list {
  display: grid;
  gap: 12px;
}

.risk-item {
  border: 1px solid var(--geo-border);
  border-radius: 10px;
  display: grid;
  gap: 8px;
  padding: 14px;
}

.risk-item__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.risk-item p,
.risk-item small {
  color: var(--geo-text-secondary);
  line-height: 1.65;
}

.positive-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.optimized-body {
  background: var(--geo-bg-soft);
  border: 1px solid var(--geo-border);
  border-radius: 12px;
  color: var(--geo-text);
  font-family: inherit;
  line-height: 1.75;
  max-height: 420px;
  overflow: auto;
  padding: 16px;
  white-space: pre-wrap;
}

.content-detail {
  background:
    radial-gradient(circle at 98% 0%, rgb(109 40 255 / 8%), transparent 24%),
    #f7f8fb;
}

.content-detail-header,
.content-flow-card,
.content-overview-card,
.content-preview-section,
.content-items-section,
.content-publish-package-section,
.content-technical-collapse,
.quality-result-card,
.publish-optimization-card,
.review-empty-card {
  border-color: #e5e0ef;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgb(24 20 36 / 5%);
}

.content-detail-header {
  position: relative;
  overflow: hidden;
  align-items: center;
  background:
    radial-gradient(circle at 90% 10%, rgb(109 40 255 / 12%), transparent 26%),
    linear-gradient(135deg, #fbfaff, #ffffff 48%);
}

.content-detail-header::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--geo-primary), var(--geo-lime));
  content: "";
}

.content-detail-header__copy,
.content-detail-actions {
  position: relative;
  z-index: 1;
}

.content-detail-header__tag {
  width: fit-content;
  border-color: #ded3ff;
  border-radius: 999px;
  background: #f5f1ff;
  color: var(--geo-primary);
  font-weight: 850;
}

.content-detail-header h2 {
  color: #111019;
  font-size: 28px;
  font-weight: 950;
}

.content-detail-actions :deep(.el-button--warning) {
  --el-button-bg-color: #fff8ec;
  --el-button-border-color: #f1d4ab;
  --el-button-text-color: #9c6b25;
  --el-button-hover-bg-color: #fff1d9;
  --el-button-hover-border-color: #e9c27e;
}

.dialog-alert {
  border-radius: 14px;
}

.content-current-action-alert {
  border-color: #e5e0ef;
  background: #fbfaff;
}

.content-flow-card :deep(.el-card__header),
.content-overview-card :deep(.el-card__header),
.quality-result-card :deep(.el-card__header),
.publish-optimization-card :deep(.el-card__header) {
  border-bottom-color: #eee9f5;
}

.content-publish-package-section {
  margin-top: 20px;
}

.publish-package-list {
  display: grid;
  gap: 14px;
}

.publish-package-card {
  border: 1px solid #e5e0ef;
  border-radius: 14px;
  background: #fbfaff;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.publish-package-card__header,
.publish-package-card__actions,
.publish-package-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
}

.publish-package-card__header span,
.publish-package-grid span {
  color: var(--geo-text-secondary);
  font-size: 12px;
}

.publish-package-card__header strong,
.publish-package-grid strong {
  color: #111019;
  font-weight: 900;
}

.publish-package-actions {
  justify-content: flex-start;
}

.publish-package-grid,
.publish-package-columns {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.publish-package-grid > div,
.publish-package-block,
.publish-package-columns > div {
  border: 1px solid #e5e0ef;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
}

.publish-package-block h4,
.publish-package-columns h4 {
  margin: 0 0 8px;
}

.publish-package-block p,
.publish-package-columns p,
.publish-package-columns li {
  color: #273849;
  line-height: 1.65;
}

.publish-package-columns ul {
  margin: 0;
  padding-left: 18px;
}

.publish-package-columns li + li {
  margin-top: 6px;
}

.publish-package-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-flow-steps :deep(.el-step__head.is-success) {
  color: #426600;
  border-color: #b6e85a;
}

.content-flow-steps :deep(.el-step__head.is-process) {
  color: var(--geo-primary);
  border-color: var(--geo-primary);
}

.content-flow-steps :deep(.el-step__title.is-process),
.content-flow-steps :deep(.el-step__title.is-success) {
  color: #111019;
  font-weight: 850;
}

.content-flow-notes > div,
.content-overview-grid > div,
.content-preview-card,
.risk-item,
.quality-summary-grid > div {
  border-color: #e5e0ef;
  border-radius: 14px;
  background: #fbfaff;
}

.content-flow-notes > div:nth-child(2n),
.content-overview-grid > div:nth-child(4n) {
  background: #f8ffe7;
  border-color: #dff59c;
}

.content-preview-card__header h4,
.review-empty-card h4,
.quality-card-header strong {
  color: #111019;
  font-weight: 900;
}

.content-preview-card__body,
.optimized-body {
  color: #273849;
}

.review-empty-card {
  overflow: hidden;
  position: relative;
}

.review-empty-card::after {
  position: absolute;
  right: -22px;
  bottom: -10px;
  width: 108px;
  height: 18px;
  border-radius: 999px;
  background: rgb(186 255 41 / 38%);
  content: "";
  transform: rotate(-10deg);
}

.review-empty-card > * {
  position: relative;
  z-index: 1;
}

.quality-summary-grid strong {
  color: #111019;
}

.positive-list :deep(.el-tag) {
  --el-tag-bg-color: #f5ffd9;
  --el-tag-border-color: #dff59c;
  --el-tag-text-color: #426600;
  border-radius: 999px;
}

@media (max-width: 900px) {
  .assistant-status-card,
  .assistant-check-grid,
  .assistant-status-actions {
    grid-template-columns: 1fr;
  }

  .assistant-status-actions {
    justify-content: flex-start;
  }

  .content-flow-notes,
  .content-overview-grid {
    grid-template-columns: 1fr;
  }

  .content-preview-card__header,
  .content-preview-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .quality-summary-grid,
  .quality-columns,
  .publish-package-grid,
  .publish-package-columns {
    grid-template-columns: 1fr;
  }
}
</style>

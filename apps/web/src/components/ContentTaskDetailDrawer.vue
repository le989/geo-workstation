<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import type {
  ContentItem,
  ContentQualityCheckResult,
  ContentQualityRiskItem,
  FormatContentItemForPublishPayload,
  ContentTaskDetail,
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

const props = defineProps<{
  modelValue: boolean;
  detail?: ContentTaskDetail | null;
  loading?: boolean;
  retrying?: boolean;
  archiving?: boolean;
  exportingIds?: string[];
  deletingIds?: string[];
  qualityCheckingIds?: string[];
  optimizingIds?: string[];
  formattingIds?: string[];
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
  optimize: [item: ContentItem];
  formatPublish: [item: ContentItem, payload: FormatContentItemForPublishPayload];
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
    ? "内容任务已创建，但真实 AI 生成失败，请查看失败原因。"
    : "当前任务已创建，但部分内容项生成失败，请查看失败原因。"
);
const failureAlertDescription = computed(() => {
  const firstReason = failedItemReasons.value[0];

  if (firstReason) {
    return `失败原因：${firstReason}`;
  }

  return isRealAiTask.value
    ? "请检查生成配置、模型服务和网络连通性，必要时调整生成方式后重试。"
    : "请查看内容项状态后重试失败任务。";
});

const expandedContentItemIds = ref<string[]>([]);

const isGeneratedContentItem = (item: ContentItem) => {
  const hasReadableContent = Boolean(item.title.trim() || item.body.trim());

  return hasReadableContent && item.status !== "failed" && item.status !== "cancelled";
};

const contentItemsCount = computed(() => props.detail?.items.length ?? 0);
const generatedItems = computed(() => props.detail?.items.filter(isGeneratedContentItem) ?? []);
const generatedItemsCount = computed(() => generatedItems.value.length);
const hasGeneratedContent = computed(() => generatedItemsCount.value > 0);
const hasQualityCheck = computed(() => Boolean(props.qualityCheckResult));
const hasPublishOptimization = computed(() => Boolean(props.publishOptimizationResult));
const hasPublishFormat = computed(() => Boolean(props.publishFormatResult));
const needsHumanReview = computed(
  () => props.qualityCheckResult?.result.publishReadiness.needsHumanReview ?? false
);
const hasRiskyQuality = computed(() => props.qualityCheckResult?.result.level === "risky");

const getContentPreview = (body: string, maxLength = 360) => {
  const normalized = body.replace(/\s+/g, " ").trim();

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const isTechnicalTaskName = (value: string) =>
  /\b(phase|smoke|mock|debug|test|batch)\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(value);

const getDisplayTaskName = () => {
  const name = props.detail?.task.name;

  return name && !isTechnicalTaskName(name) ? name : "GEO 内容生成任务详情";
};

const isContentExpanded = (id: string) => expandedContentItemIds.value.includes(id);

const toggleContentPreview = (id: string) => {
  expandedContentItemIds.value = isContentExpanded(id)
    ? expandedContentItemIds.value.filter((itemId) => itemId !== id)
    : [...expandedContentItemIds.value, id];
};

const findPromptText = (geoPromptId?: string | null) =>
  props.detail?.prompts.find((prompt) => prompt.id === geoPromptId)?.promptText ?? "--";

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
      ? `已生成 ${generatedItemsCount.value} 个内容项`
      : "创建任务后由 AI 生成内容项"
  },
  {
    title: "质量检查",
    label: hasQualityCheck.value
      ? hasRiskyQuality.value
        ? "风险较高"
        : needsHumanReview.value
          ? "可进入人工审校"
          : "已完成"
      : hasGeneratedContent.value
        ? "待质量检查"
        : "未开始",
    description: hasQualityCheck.value
      ? props.qualityCheckResult?.result.publishReadiness.suggestedAction
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
      : "基于质量检查结果生成更稳妥版本"
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
      title: "请选择一个内容任务",
      description: "打开任务详情后可查看生成、审校和发布稿准备进度。"
    };
  }

  if (props.detail.task.status === "failed" || hasFailedItems.value) {
    return {
      type: "error" as const,
      title: "建议先处理生成失败",
      description: "查看失败内容项原因，必要时重试失败任务；重试不会重复生成已成功内容项。"
    };
  }

  if (!hasGeneratedContent.value) {
    return {
      type: "info" as const,
      title: "内容仍未生成完成",
      description: "请等待生成结果返回，或刷新详情查看内容项状态。"
    };
  }

  if (!hasQualityCheck.value) {
    return {
      type: "warning" as const,
      title: "建议执行质量检查",
      description: "内容已生成，下一步应检查知识库外参数、协议、认证、过度营销和 GEO 结构风险。"
    };
  }

  if (hasRiskyQuality.value || needsHumanReview.value) {
    return {
      type: "warning" as const,
      title: "建议先人工审校风险项",
      description: "质量检查发现需要复核的内容，先处理风险项，再生成或使用发布优化稿。"
    };
  }

  if (!hasPublishOptimization.value) {
    return {
      type: "info" as const,
      title: "可以生成发布优化版",
      description: "质量检查已完成，可生成更稳妥的发布优化稿；优化稿不会覆盖原文。"
    };
  }

  if (!hasPublishFormat.value) {
    return {
      type: "info" as const,
      title: "建议生成富文本发布稿",
      description: "发布优化版已生成，可以选择优化稿作为来源生成 HTML、Markdown 和纯文本。"
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
  knowledge_gap: "知识库缺口"
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
            GEO 内容任务
          </el-tag>
          <h2>{{ getDisplayTaskName() }}</h2>
          <p>
            查看提示词、企业知识库和指令模板如何共同生成内容资产，判断这些内容是否能支撑 AI
            回答中的品牌提及、推荐和引用。
          </p>
        </div>
        <div class="content-detail-actions">
          <el-button :loading="loading" @click="emit('refresh')">刷新详情</el-button>
          <el-button v-if="canRetry" type="warning" :loading="retrying" @click="emit('retry')">
            重试失败任务
          </el-button>
          <el-button v-if="canArchive" plain :loading="archiving" @click="emit('archive')">
            归档任务
          </el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-alert
        title="重试不会重复生成已成功内容项，只会处理失败或缺失的 GEO 内容结果。"
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

        <el-alert
          :title="currentAction.title"
          :description="currentAction.description"
          :type="currentAction.type"
          :closable="false"
          show-icon
          class="dialog-alert content-current-action-alert"
        />

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
              <span>GEO 词 / 提示词</span>
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
                    <strong>生成内容 → 质量检查 → 发布优化 → 富文本稿 → 人工发布</strong>
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
              <p class="section-kicker">内容预览</p>
              <h3>先看标题、摘要和正文，再决定审校动作</h3>
              <p>默认只展示正文摘要，展开后可阅读全文；不会修改或截断真实内容。</p>
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
                {{ isContentExpanded(item.id) ? item.body : getContentPreview(item.body) }}
              </p>
              <div class="content-preview-card__footer">
                <span>建议发布位置：{{ formatOptional(item.suggestedPublishChannel) }}</span>
                <el-button text type="primary" @click="toggleContentPreview(item.id)">
                  {{ isContentExpanded(item.id) ? "收起正文" : "展开阅读全文" }}
                </el-button>
              </div>
            </article>
          </div>
          <el-empty v-else description="暂无内容项" />
        </section>

        <section class="content-items-section">
          <div class="section-heading">
            <div>
              <p class="section-kicker">内容项操作</p>
              <h3>编辑、质检、优化和导出入口</h3>
              <p>查看入口始终可用；编辑、质检、优化和导出会按当前账号权限展示。</p>
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

        <el-collapse class="content-technical-collapse">
          <el-collapse-item name="technical">
            <template #title>
              <span class="technical-collapse-title">技术信息与上下文（默认折叠）</span>
            </template>
            <el-descriptions :column="3" border class="content-detail-summary">
              <el-descriptions-item label="内容任务 ID">
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
              <p class="section-kicker">发布前审校</p>
              <h3>内容质量检查与发布优化版</h3>
              <p>
                质量检查会识别知识库外参数、协议、认证、过度承诺、品牌表达和 GEO
                结构风险；生成发布优化版不会自动覆盖原文。
              </p>
            </div>
          </div>

          <el-alert
            title="质量检查和发布优化用于辅助人工审校，生成结果不会自动覆盖原文。"
            type="info"
            :closable="false"
            show-icon
            class="dialog-alert"
          />

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
                  <span>质量检查结果</span>
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
              <el-tag type="warning" effect="plain">待质量检查</el-tag>
              <h4>先检查，再进入发布优化</h4>
              <p>
                内容已生成时，建议先执行质量检查，确认是否存在知识库外参数、协议、认证、过度营销或品牌表达风险。
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
                建议在质量检查后生成发布优化版，用于弱化事实风险、保留 GEO
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
      </template>

      <el-empty v-else description="请选择一个内容任务查看详情" />
    </section>
  </el-drawer>
</template>

<style scoped>
.content-quality-section {
  margin-top: 20px;
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
  .quality-columns {
    grid-template-columns: 1fr;
  }
}
</style>

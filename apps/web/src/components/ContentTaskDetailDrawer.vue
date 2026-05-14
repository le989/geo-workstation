<script setup lang="ts">
import { computed } from "vue";
import { ElMessage } from "element-plus";
import type {
  ContentItem,
  ContentQualityCheckResult,
  ContentQualityRiskItem,
  ContentTaskDetail,
  PublishOptimizationResult
} from "@/api/content";
import ContentGenerationTypeTag from "@/components/ContentGenerationTypeTag.vue";
import ContentItemTable from "@/components/ContentItemTable.vue";
import ContentTaskStatusTag from "@/components/ContentTaskStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
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
  exportingIds?: string[];
  deletingIds?: string[];
  qualityCheckingIds?: string[];
  optimizingIds?: string[];
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
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  refresh: [];
  retry: [];
  view: [item: ContentItem];
  edit: [item: ContentItem];
  export: [item: ContentItem];
  delete: [item: ContentItem];
  qualityCheck: [item: ContentItem];
  optimize: [item: ContentItem];
}>();

const hasFailedItems = computed(
  () => props.detail?.items.some((item) => item.status === "failed") ?? false
);
const canRetry = computed(() => props.detail?.task.status === "failed" || hasFailedItems.value);
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
    ? "请检查后端 .env 中的 AI Provider 配置、API Key、baseURL、模型名称或网络连通性，也可以切换为模拟生成。"
    : "请查看内容项状态后重试失败任务。";
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

const getRiskTypeLabel = (item: ContentQualityRiskItem) => riskTypeLabelMap[item.type] ?? item.type;
const getQualityLevelLabel = (level: string) => qualityLevelLabelMap[level] ?? level;
const getQualityLevelType = (level: string) => qualityLevelTagMap[level] ?? "info";

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
        <div>
          <el-tag type="success" effect="plain">GEO 内容任务</el-tag>
          <h2>{{ detail?.task.name ?? "GEO 内容任务详情" }}</h2>
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

        <el-descriptions :column="3" border class="content-detail-summary">
          <el-descriptions-item label="任务名称">
            {{ detail.task.name }}
          </el-descriptions-item>
          <el-descriptions-item label="产品线">
            {{ formatOptional(detail.task.productLine) }}
          </el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <ContentTaskStatusTag :status="detail.task.status" />
          </el-descriptions-item>
          <el-descriptions-item label="生成类型">
            <ContentGenerationTypeTag :type="detail.task.generationType" />
          </el-descriptions-item>
          <el-descriptions-item label="目标模型">
            {{ formatOptional(detail.task.targetModel) }}
          </el-descriptions-item>
          <el-descriptions-item label="AI 生成方式 / 模型">
            {{ formatProviderModel(detail.task.provider, detail.task.model) }}
          </el-descriptions-item>
          <el-descriptions-item label="知识库">
            {{ detail.knowledgeBase?.name ?? "--" }}
          </el-descriptions-item>
          <el-descriptions-item label="指令模板">
            {{ detail.instructionTemplate?.name ?? "--" }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detail.task.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="content-workflow-strip">
          <div class="content-workflow-card">
            <span>提示词</span>
            <strong>{{ detail.prompts.length }} 个</strong>
            <small>决定内容要服务的 AI 问答入口。</small>
          </div>
          <div class="content-workflow-card">
            <span>知识库</span>
            <strong>{{ detail.knowledgeBase?.name ?? "未选择" }}</strong>
            <small>约束内容事实来源，减少未经证实的参数。</small>
          </div>
          <div class="content-workflow-card">
            <span>指令模板</span>
            <strong>{{ detail.instructionTemplate?.name ?? "未选择" }}</strong>
            <small>控制文章结构、质量规则和禁止事项。</small>
          </div>
          <div class="content-workflow-card">
            <span>生成方式</span>
            <strong>{{ formatProviderModel(detail.task.provider, detail.task.model) }}</strong>
            <small>真实 AI 接口会消耗额度，失败原因会保留在内容项中。</small>
          </div>
        </section>

        <div class="content-detail-grid">
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

        <section class="content-items-section">
          <div class="section-heading">
            <div>
              <p class="section-kicker">内容项</p>
              <h3>生成内容项</h3>
              <p>这些内容项服务于具体 GEO 提示词，可编辑、软删除或导出 Markdown。</p>
            </div>
          </div>
          <ContentItemTable
            :items="detail.items"
            :prompts="detail.prompts"
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
            title="选择真实 AI 接口做质量检查或发布优化会消耗接口额度；API Key 只在后端 .env 管理，前端不会展示或保存。"
            type="warning"
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

@media (max-width: 900px) {
  .quality-summary-grid,
  .quality-columns {
    grid-template-columns: 1fr;
  }
}
</style>

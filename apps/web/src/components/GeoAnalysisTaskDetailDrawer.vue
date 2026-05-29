<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  ConvertAnalysisPromptsPayload,
  ConvertAnalysisPromptsResult,
  CreateAnalysisContentTaskPayload,
  GeoAnalysisTaskDetail
} from "@/api/geo-analysis";
import AnalysisGapList from "@/components/AnalysisGapList.vue";
import ConvertPromptsPanel from "@/components/ConvertPromptsPanel.vue";
import CreateAnalysisContentTaskPanel from "@/components/CreateAnalysisContentTaskPanel.vue";
import GeoAnalysisStatusTag from "@/components/GeoAnalysisStatusTag.vue";
import GeoModelResultsTable from "@/components/GeoModelResultsTable.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import {
  analysisSummaryLabels,
  formatGeoAnalysisDisplayText,
  formatGeoAnalysisTaskTitle,
  formatTargetModelNames
} from "@/config/geo-analysis-options";
import {
  formatDateTime,
  formatOptional,
  userIntentLabelMap
} from "@/config/geo-prompt-options";

const props = defineProps<{
  modelValue: boolean;
  detail?: GeoAnalysisTaskDetail | null;
  loading?: boolean;
  running?: boolean;
  archiving?: boolean;
  convertSubmitting?: boolean;
  contentTaskSubmitting?: boolean;
  convertResult?: ConvertAnalysisPromptsResult | null;
  convertError?: string;
  contentTaskError?: string;
  canManageActions?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  refresh: [];
  run: [];
  archive: [];
  convertPrompts: [payload: ConvertAnalysisPromptsPayload];
  createContentTask: [payload: CreateAnalysisContentTaskPayload];
  goToPrompts: [];
  goToContentTasks: [];
}>();

const selectedPromptTexts = ref<string[]>([]);

const canRun = computed(
  () =>
    props.canManageActions !== false &&
    (props.detail?.task.status === "pending" || props.detail?.task.status === "failed")
);
const canManageActions = computed(() => props.canManageActions !== false);
const canArchive = computed(
  () =>
    canManageActions.value &&
    Boolean(props.detail?.task) &&
    props.detail?.task.status !== "running" &&
    props.detail?.task.status !== "cancelled"
);
const displayTaskName = computed(() =>
  props.detail?.task
    ? formatGeoAnalysisTaskTitle(props.detail.task.name, props.detail.task.brandName)
    : "GEO 诊断任务详情"
);
const presentationSummaryKeys = new Set([
  "conclusion",
  "brandName",
  "productLine",
  "websiteSignal",
  "contentGapCount",
  "knowledgeGapCount",
  "promptSuggestionCount",
  "modelCount",
  "targetModels",
  "websiteUrl"
]);
const summaryEntries = computed(() => {
  const summary = props.detail?.task.summary;
  if (!summary) {
    return [];
  }
  return Object.entries(summary).filter(
    ([key, value]) =>
      value !== undefined && value !== null && presentationSummaryKeys.has(key)
  );
});
const technicalSummaryEntries = computed(() => {
  const summary = props.detail?.task.summary;
  if (!summary) {
    return [];
  }
  return Object.entries(summary).filter(
    ([key, value]) =>
      value !== undefined && value !== null && !presentationSummaryKeys.has(key)
  );
});
const summaryJson = computed(() =>
  props.detail?.task.summary ? JSON.stringify(props.detail.task.summary, null, 2) : ""
);

watch(
  () => props.detail?.task.id,
  () => {
    selectedPromptTexts.value =
      props.detail?.task.promptSuggestions.map((item) => item.promptText) ?? [];
  }
);

const close = () => {
  emit("update:modelValue", false);
};

const formatSummaryValue = (key: string, value: unknown) => {
  if (key === "productLine" && typeof value === "string") {
    return formatGeoAnalysisDisplayText(value);
  }
  if (key === "targetModels" && Array.isArray(value)) {
    return formatTargetModelNames(value.map(String));
  }
  if (typeof value === "string") {
    return formatGeoAnalysisDisplayText(value, value);
  }
  if (Array.isArray(value)) {
    return (
      value.map((item) => formatGeoAnalysisDisplayText(String(item), String(item))).join("、") ||
      "--"
    );
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value ?? "--");
};
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="90%"
    :with-header="false"
    class="geo-analysis-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="analysis-detail">
      <div class="analysis-detail-header">
        <div>
          <el-tag type="success" effect="plain">GEO 分析 / 诊断详情</el-tag>
          <h2>{{ displayTaskName }}</h2>
          <p>
            从品牌、官网和产品线出发，复盘诊断结果，并整理后续提示词、知识库和内容补齐方向。
          </p>
        </div>
        <div class="analysis-detail-actions">
          <el-button :loading="loading" @click="emit('refresh')">刷新详情</el-button>
          <el-button v-if="canRun" type="primary" :loading="running" @click="emit('run')">
            运行诊断
          </el-button>
          <el-button v-if="canArchive" plain :loading="archiving" @click="emit('archive')">
            归档任务
          </el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-alert
        title="诊断详情用于辅助判断品牌提及、官网引用、竞品占位和后续内容补齐方向。"
        type="info"
        :closable="false"
        show-icon
        class="dialog-alert"
      />

      <el-skeleton v-if="loading && !detail" :rows="10" animated />

      <template v-else-if="detail">
        <section class="analysis-next-action-bar">
          <div>
            <p class="section-kicker">后续动作</p>
            <h3>把诊断结果转成可执行资产</h3>
            <p>先将提示词建议沉淀为策略库资产，再基于提示词、知识库和指令模板进入 GEO 内容生成。</p>
          </div>
          <div>
            <el-button type="primary" plain @click="emit('goToPrompts')">
              查看提示词策略库
            </el-button>
            <el-button type="primary" @click="emit('goToContentTasks')"> 查看 GEO 内容生成 </el-button>
          </div>
        </section>

        <el-descriptions :column="3" border class="analysis-detail-summary">
          <el-descriptions-item label="任务名称">{{ displayTaskName }}</el-descriptions-item>
          <el-descriptions-item label="品牌名称">{{ detail.task.brandName }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <GeoAnalysisStatusTag :status="detail.task.status" />
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(detail.task.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="官网">
            {{ formatOptional(detail.task.websiteUrl) }}
          </el-descriptions-item>
          <el-descriptions-item label="产品线">
            {{ formatGeoAnalysisDisplayText(detail.task.productLine) }}
          </el-descriptions-item>
          <el-descriptions-item label="目标模型">
            {{ formatTargetModelNames(detail.task.targetModels) }}
          </el-descriptions-item>
          <el-descriptions-item label="提示词建议">
            {{ detail.task.promptSuggestions.length }}
          </el-descriptions-item>
          <el-descriptions-item label="模型结果">
            {{ detail.modelResults.length }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detail.task.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-card shadow="never" class="summary-card">
          <template #header>
            <div class="summary-card-header">
              <div>
                <p class="section-kicker">诊断摘要</p>
                <h3>GEO 诊断摘要</h3>
                <p>摘要用于快速判断品牌在 AI 回答中的可见度和下一步补齐方向。</p>
              </div>
            </div>
          </template>
          <div v-if="summaryEntries.length > 0" class="summary-grid">
            <div v-for="[key, value] in summaryEntries" :key="key" class="summary-item">
              <span>{{ analysisSummaryLabels[key] ?? key }}</span>
              <strong>{{ formatSummaryValue(key, value) }}</strong>
            </div>
          </div>
          <el-empty v-else description="暂无摘要，运行诊断后会生成诊断摘要" />
          <el-collapse class="analysis-tech-collapse">
            <el-collapse-item title="排查信息" name="analysis-tech">
              <div class="analysis-tech-grid">
                <span>任务 ID</span>
                <strong>{{ detail.task.id }}</strong>
                <span>原始任务名称</span>
                <strong>{{ detail.task.name }}</strong>
                <span>创建人</span>
                <strong>{{ detail.task.createdBy }}</strong>
                <span>更新时间</span>
                <strong>{{ formatDateTime(detail.task.updatedAt) }}</strong>
                <template v-for="[key, value] in technicalSummaryEntries" :key="key">
                  <span>{{ analysisSummaryLabels[key] ?? key }}</span>
                  <strong>{{ formatSummaryValue(key, value) }}</strong>
                </template>
              </div>
              <pre v-if="summaryJson">{{ summaryJson }}</pre>
            </el-collapse-item>
          </el-collapse>
        </el-card>

        <div class="analysis-gap-grid">
          <AnalysisGapList
            title="内容补齐方向"
            description="需要补哪些文章、FAQ、需求决策指南、场景方案或对比内容资产。"
            empty-text="暂无内容缺口，运行诊断后会给出建议。"
            :gaps="detail.task.contentGaps"
            type="content"
          />
          <AnalysisGapList
            title="知识库缺口"
            description="需要补哪些企业事实资料，让后续内容生成和 AI 引用更稳定。"
            empty-text="暂无知识库缺口，运行诊断后会给出建议。"
            :gaps="detail.task.knowledgeGaps"
            type="knowledge"
          />
        </div>

        <ConvertPromptsPanel
          v-if="canManageActions"
          v-model:selected-prompt-texts="selectedPromptTexts"
          :suggestions="detail.task.promptSuggestions"
          :product-line="detail.task.productLine"
          :submitting="convertSubmitting"
          :result="convertResult"
          :error-message="convertError"
          @submit="emit('convertPrompts', $event)"
        />

        <div class="related-prompts-card">
          <div class="section-heading">
            <div>
              <p class="section-kicker">关联提示词</p>
              <h3>已转入提示词</h3>
              <p>这些提示词已经沉淀到策略库，可继续用于内容生成和模型覆盖记录。</p>
            </div>
            <el-button type="primary" plain @click="emit('goToPrompts')">
              前往提示词策略库
            </el-button>
          </div>
          <div v-if="detail.relatedPrompts.length > 0" class="related-prompt-list">
            <div
              v-for="prompt in detail.relatedPrompts"
              :key="prompt.id"
              class="related-prompt-item"
            >
              <strong>{{ formatGeoAnalysisDisplayText(prompt.promptText) }}</strong>
              <GeoPromptTypeTag :type="prompt.type" />
              <span>{{ userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent }}</span>
              <span>优先级 {{ prompt.priority }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无已转入提示词" />
        </div>

        <GeoModelResultsTable :results="detail.modelResults" />

        <el-collapse v-if="canManageActions" class="analysis-action-collapse">
          <el-collapse-item title="创建内容任务" name="content-task">
            <CreateAnalysisContentTaskPanel
              :task="detail.task"
              :related-prompts="detail.relatedPrompts"
              :submitting="contentTaskSubmitting"
              :error-message="contentTaskError"
              @submit="emit('createContentTask', $event)"
            />
          </el-collapse-item>
        </el-collapse>

        <div class="content-task-link">
          <el-button type="primary" plain @click="emit('goToContentTasks')">
            前往 GEO 内容生成页面
          </el-button>
        </div>
      </template>

      <el-empty v-else description="请选择一个 GEO 诊断任务查看详情" />
    </section>
  </el-drawer>
</template>

<style scoped>
.analysis-detail {
  display: grid;
  gap: 18px;
  padding: 8px 4px 24px;
}

.analysis-detail-header,
.section-heading {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.analysis-detail-header {
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--geo-shadow-sm);
}

.analysis-detail-header::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #2563eb, #0e7490);
  opacity: 0.72;
  content: "";
}

.analysis-detail-header h2,
.section-heading h3,
.summary-card-header h3 {
  margin: 6px 0;
  color: #13243a;
  letter-spacing: 0;
}

.analysis-detail-header p,
.section-heading p,
.summary-card-header p {
  max-width: 720px;
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.analysis-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.analysis-detail-summary {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.analysis-next-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #fbfdff;
  box-shadow: var(--geo-shadow-sm);
}

.analysis-next-action-bar h3 {
  margin: 0 0 6px;
  color: #13243a;
}

.analysis-next-action-bar p:not(.section-kicker) {
  margin: 0;
  color: var(--geo-muted);
  line-height: 1.65;
}

.analysis-next-action-bar > div:last-child {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e5edf4;
  border-radius: 8px;
  background: #fbfdff;
}

.summary-item span {
  color: #64748b;
  font-size: 13px;
}

.summary-item strong {
  color: #1f2937;
  line-height: 1.6;
  word-break: break-word;
}

.analysis-tech-collapse,
.analysis-action-collapse {
  margin-top: 14px;
}

.analysis-tech-grid {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 10px 14px;
  margin-bottom: 14px;
}

.analysis-tech-grid span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.analysis-tech-grid strong {
  min-width: 0;
  color: #334155;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.analysis-tech-collapse pre {
  max-height: 240px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.analysis-gap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.related-prompts-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--geo-shadow-sm);
}

.related-prompt-list {
  display: grid;
  gap: 8px;
}

.related-prompt-item {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5edf4;
  border-radius: 8px;
  background: #fbfdff;
}

.content-task-link {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 980px) {
  .analysis-detail-header,
  .section-heading,
  .analysis-next-action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .analysis-gap-grid {
    grid-template-columns: 1fr;
  }
}
</style>

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
import { analysisSummaryLabels } from "@/config/geo-analysis-options";
import {
  formatDateTime,
  formatOptional,
  formatTargetModels,
  userIntentLabelMap
} from "@/config/geo-prompt-options";

const props = defineProps<{
  modelValue: boolean;
  detail?: GeoAnalysisTaskDetail | null;
  loading?: boolean;
  running?: boolean;
  convertSubmitting?: boolean;
  contentTaskSubmitting?: boolean;
  convertResult?: ConvertAnalysisPromptsResult | null;
  convertError?: string;
  contentTaskError?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  refresh: [];
  run: [];
  convertPrompts: [payload: ConvertAnalysisPromptsPayload];
  createContentTask: [payload: CreateAnalysisContentTaskPayload];
  goToPrompts: [];
  goToContentTasks: [];
}>();

const selectedPromptTexts = ref<string[]>([]);

const canRun = computed(
  () => props.detail?.task.status === "pending" || props.detail?.task.status === "failed"
);
const summaryEntries = computed(() => {
  const summary = props.detail?.task.summary;
  if (!summary) {
    return [];
  }
  return Object.entries(summary).filter(([, value]) => value !== undefined && value !== null);
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

const formatSummaryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.join("、") || "--";
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
          <el-tag type="success" effect="plain">GEO Analysis</el-tag>
          <h2>{{ detail?.task.name ?? "GEO 分析任务详情" }}</h2>
          <p>
            从品牌提及、推荐、官网引用、竞品出现、提示词缺口、知识库缺口和内容补齐方向复盘 Mock GEO
            分析结果。
          </p>
        </div>
        <div class="analysis-detail-actions">
          <el-button :loading="loading" @click="emit('refresh')">刷新详情</el-button>
          <el-button v-if="canRun" type="warning" :loading="running" @click="emit('run')">
            运行 Mock 分析
          </el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-alert
        title="当前阶段为 Mock GEO 分析，不调用真实外部 AI 平台，不访问真实网站，也不做 SEO 扫描器。"
        type="warning"
        :closable="false"
        show-icon
        class="dialog-alert"
      />

      <el-skeleton v-if="loading && !detail" :rows="10" animated />

      <template v-else-if="detail">
        <el-descriptions :column="3" border class="analysis-detail-summary">
          <el-descriptions-item label="任务名称">{{ detail.task.name }}</el-descriptions-item>
          <el-descriptions-item label="品牌名称">{{ detail.task.brandName }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <GeoAnalysisStatusTag :status="detail.task.status" />
          </el-descriptions-item>
          <el-descriptions-item label="官网">
            {{ formatOptional(detail.task.websiteUrl) }}
          </el-descriptions-item>
          <el-descriptions-item label="产品线">
            {{ formatOptional(detail.task.productLine) }}
          </el-descriptions-item>
          <el-descriptions-item label="目标模型">
            {{ formatTargetModels(detail.task.targetModels) }}
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
                <p class="section-kicker">Summary</p>
                <h3>GEO 诊断摘要</h3>
                <p>摘要用于快速判断品牌在 AI 回答中的可见度和下一步补齐方向。</p>
              </div>
            </div>
          </template>
          <div v-if="summaryEntries.length > 0" class="summary-grid">
            <div v-for="[key, value] in summaryEntries" :key="key" class="summary-item">
              <span>{{ analysisSummaryLabels[key] ?? key }}</span>
              <strong>{{ formatSummaryValue(value) }}</strong>
            </div>
          </div>
          <el-empty v-else description="暂无 summary，运行 Mock 分析后会生成诊断摘要" />
          <el-collapse v-if="summaryJson" class="summary-json">
            <el-collapse-item title="查看原始 summary JSON" name="summary-json">
              <pre>{{ summaryJson }}</pre>
            </el-collapse-item>
          </el-collapse>
        </el-card>

        <div class="analysis-gap-grid">
          <AnalysisGapList
            title="内容补齐方向"
            description="需要补哪些文章、FAQ、选型指南、应用方案或对比内容资产。"
            empty-text="暂无内容缺口，运行 Mock 分析后会给出建议。"
            :gaps="detail.task.contentGaps"
            type="content"
          />
          <AnalysisGapList
            title="知识库缺口"
            description="需要补哪些企业事实资料，让后续内容生成和 AI 引用更稳定。"
            empty-text="暂无知识库缺口，运行 Mock 分析后会给出建议。"
            :gaps="detail.task.knowledgeGaps"
            type="knowledge"
          />
        </div>

        <ConvertPromptsPanel
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
              <p class="section-kicker">Related Prompts</p>
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
              <strong>{{ prompt.promptText }}</strong>
              <GeoPromptTypeTag :type="prompt.type" />
              <span>{{ userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent }}</span>
              <span>优先级 {{ prompt.priority }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无已转入提示词" />
        </div>

        <GeoModelResultsTable :results="detail.modelResults" />

        <CreateAnalysisContentTaskPanel
          :task="detail.task"
          :related-prompts="detail.relatedPrompts"
          :submitting="contentTaskSubmitting"
          :error-message="contentTaskError"
          @submit="emit('createContentTask', $event)"
        />

        <div class="content-task-link">
          <el-button type="primary" plain @click="emit('goToContentTasks')">
            前往 GEO 内容生成页面
          </el-button>
        </div>
      </template>

      <el-empty v-else description="请选择一个 GEO 分析任务查看详情" />
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
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.analysis-detail-header h2,
.section-heading h3,
.summary-card-header h3 {
  margin: 6px 0;
  color: #1f2937;
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
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

.summary-json {
  margin-top: 14px;
}

.summary-json pre {
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
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.content-task-link {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 980px) {
  .analysis-detail-header,
  .section-heading {
    flex-direction: column;
  }

  .summary-grid,
  .analysis-gap-grid {
    grid-template-columns: 1fr;
  }
}
</style>

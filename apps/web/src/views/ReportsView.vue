<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  exportReport,
  getContentCoverage,
  getGeoOverview,
  getKnowledgeCoverage,
  getModelCoverage,
  getOptimizationSuggestions,
  getPromptCoverage,
  type ContentCoverageReport,
  type GeoOverviewReport,
  type KnowledgeCoverageReport,
  type ModelCoverageReport,
  type OptimizationSuggestion,
  type PromptCoverageReport,
  type ReportExportType,
  type ReportQuery
} from "@/api/reports";
import AppErrorState from "@/components/AppErrorState.vue";
import ContentCoveragePanel from "@/components/ContentCoveragePanel.vue";
import KnowledgeCoveragePanel from "@/components/KnowledgeCoveragePanel.vue";
import ModelCoveragePanel from "@/components/ModelCoveragePanel.vue";
import OptimizationSuggestionsPanel from "@/components/OptimizationSuggestionsPanel.vue";
import PromptCoveragePanel from "@/components/PromptCoveragePanel.vue";
import ReportExportButton from "@/components/ReportExportButton.vue";
import ReportFilters from "@/components/ReportFilters.vue";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import {
  formatReportNumber,
  formatReportPercent,
  reportExportTypeLabelMap,
  toReportPercent
} from "@/config/report-options";

type ReportMetric = {
  label: string;
  value: string;
  description: string;
  percent?: number;
  tone?: "default" | "good" | "warning" | "danger";
};

const activeTab = ref<ReportExportType>("geo_overview");
const reportFilters = reactive<ReportQuery>({});
const suggestionLimit = ref(50);
const lastLoadedAt = ref("");

const overview = ref<GeoOverviewReport | null>(null);
const promptCoverage = ref<PromptCoverageReport | null>(null);
const modelCoverage = ref<ModelCoverageReport | null>(null);
const contentCoverage = ref<ContentCoverageReport | null>(null);
const knowledgeCoverage = ref<KnowledgeCoverageReport | null>(null);
const suggestions = ref<OptimizationSuggestion[]>([]);

const loading = reactive<Record<ReportExportType, boolean>>({
  content_coverage: false,
  geo_overview: false,
  knowledge_coverage: false,
  model_coverage: false,
  optimization_suggestions: false,
  prompt_coverage: false
});

const errors = reactive<Record<ReportExportType, string>>({
  content_coverage: "",
  geo_overview: "",
  knowledge_coverage: "",
  model_coverage: "",
  optimization_suggestions: "",
  prompt_coverage: ""
});

const loadedTabs = reactive<Record<ReportExportType, boolean>>({
  content_coverage: false,
  geo_overview: false,
  knowledge_coverage: false,
  model_coverage: false,
  optimization_suggestions: false,
  prompt_coverage: false
});

const exporting = ref<ReportExportType | "">("");

const reportTabs: Array<{ label: string; name: ReportExportType }> = [
  { label: "总览", name: "geo_overview" },
  { label: "提示词覆盖", name: "prompt_coverage" },
  { label: "模型覆盖", name: "model_coverage" },
  { label: "内容覆盖", name: "content_coverage" },
  { label: "知识库覆盖", name: "knowledge_coverage" },
  { label: "优化建议", name: "optimization_suggestions" }
];

const buildBaseQuery = (): ReportQuery => ({
  from: reportFilters.from,
  model: reportFilters.model?.trim() || undefined,
  productLine: reportFilters.productLine?.trim() || undefined,
  to: reportFilters.to
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.message}。后端未连接时页面仍可访问，请先确认 API 服务是否启动。`;
  }

  return "请求失败。后端未连接时页面仍可访问，请先确认 API 服务是否启动。";
};

const updateLoadedAt = () => {
  lastLoadedAt.value = new Date().toLocaleString();
};

const loadReport = async (tab: ReportExportType) => {
  loading[tab] = true;
  errors[tab] = "";

  try {
    const query = buildBaseQuery();

    if (tab === "geo_overview") {
      overview.value = await getGeoOverview(query);
    }
    if (tab === "prompt_coverage") {
      promptCoverage.value = await getPromptCoverage(query);
    }
    if (tab === "model_coverage") {
      modelCoverage.value = await getModelCoverage(query);
    }
    if (tab === "content_coverage") {
      contentCoverage.value = await getContentCoverage(query);
    }
    if (tab === "knowledge_coverage") {
      knowledgeCoverage.value = await getKnowledgeCoverage(query);
    }
    if (tab === "optimization_suggestions") {
      const result = await getOptimizationSuggestions({
        limit: suggestionLimit.value,
        model: query.model,
        priority: query.priority,
        productLine: query.productLine
      });
      suggestions.value = result.items;
    }

    loadedTabs[tab] = true;
    updateLoadedAt();
  } catch (error) {
    errors[tab] = getErrorMessage(error);
  } finally {
    loading[tab] = false;
  }
};

const refreshCurrentReport = () => {
  void loadReport(activeTab.value);
};

const resetFilters = () => {
  reportFilters.from = undefined;
  reportFilters.model = undefined;
  reportFilters.productLine = undefined;
  reportFilters.to = undefined;
  refreshCurrentReport();
};

const handleTabChange = (name: string | number) => {
  const tab = name as ReportExportType;
  if (!loadedTabs[tab]) {
    void loadReport(tab);
  }
};

const downloadText = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const handleExport = async (reportType: ReportExportType) => {
  exporting.value = reportType;
  try {
    const csv = await exportReport({
      ...buildBaseQuery(),
      limit: reportType === "optimization_suggestions" ? suggestionLimit.value : undefined,
      reportType
    });
    downloadText(csv, `geo-report-${reportType}.csv`);
    ElMessage.success(`已导出 ${reportExportTypeLabelMap[reportType]} CSV`);
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    exporting.value = "";
  }
};

const overviewMetrics = computed<ReportMetric[]>(() => [
  {
    label: "promptTotal 提示词总量",
    value: formatReportNumber(overview.value?.promptTotal),
    description: "GEO 提示词资产总规模"
  },
  {
    label: "basePromptCount 训练词",
    value: formatReportNumber(overview.value?.basePromptCount),
    description: "用于诊断和拓词的基础词"
  },
  {
    label: "distilledPromptCount 蒸馏词",
    value: formatReportNumber(overview.value?.distilledPromptCount),
    description: "用户会向 AI 提问的选择型问法"
  },
  {
    label: "brandPromptCount 品牌词",
    value: formatReportNumber(overview.value?.brandPromptCount),
    description: "品牌验证和推荐相关提示词"
  },
  {
    label: "scenePromptCount 场景词",
    value: formatReportNumber(overview.value?.scenePromptCount),
    description: "应用场景驱动的 GEO 问法"
  },
  {
    label: "trackedPromptCount 追踪词",
    value: formatReportNumber(overview.value?.trackedPromptCount),
    description: "需要持续检测模型表现的提示词"
  },
  {
    label: "highPriorityPromptCount 高优先级词",
    value: formatReportNumber(overview.value?.highPriorityPromptCount),
    description: "优先补检测、内容和资料的提示词",
    tone: "warning"
  },
  {
    label: "knowledgeBaseCount 知识库",
    value: formatReportNumber(overview.value?.knowledgeBaseCount),
    description: "企业 GEO 知识资产集合"
  },
  {
    label: "knowledgeChunkCount 知识片段",
    value: formatReportNumber(overview.value?.knowledgeChunkCount),
    description: "可供内容生成引用的事实资料"
  },
  {
    label: "contentTaskCount 内容任务",
    value: formatReportNumber(overview.value?.contentTaskCount),
    description: "围绕提示词创建的内容任务"
  },
  {
    label: "contentItemCount 内容项",
    value: formatReportNumber(overview.value?.contentItemCount),
    description: "已沉淀的 GEO 内容资产"
  },
  {
    label: "failedContentTaskCount 失败任务",
    value: formatReportNumber(overview.value?.failedContentTaskCount),
    description: "需要重试或补输入的内容任务",
    tone: (overview.value?.failedContentTaskCount ?? 0) > 0 ? "danger" : "default"
  },
  {
    label: "modelInclusionRecordCount 覆盖记录",
    value: formatReportNumber(overview.value?.modelInclusionRecordCount),
    description: "人工录入或导入的模型表现记录"
  },
  {
    label: "brandMentionedCount 品牌提及",
    value: formatReportNumber(overview.value?.brandMentionedCount),
    description: "AI 回答中提及品牌的次数",
    tone: "good"
  },
  {
    label: "brandRecommendedCount 品牌推荐",
    value: formatReportNumber(overview.value?.brandRecommendedCount),
    description: "AI 明确推荐品牌的次数",
    tone: "good"
  },
  {
    label: "brandMentionRate 品牌提及率",
    value: formatReportPercent(overview.value?.brandMentionRate),
    description: "覆盖记录中提及品牌的比例",
    percent: toReportPercent(overview.value?.brandMentionRate)
  },
  {
    label: "brandRecommendRate 品牌推荐率",
    value: formatReportPercent(overview.value?.brandRecommendRate),
    description: "覆盖记录中推荐品牌的比例",
    percent: toReportPercent(overview.value?.brandRecommendRate)
  },
  {
    label: "citedOfficialSiteCount 官网引用",
    value: formatReportNumber(overview.value?.citedOfficialSiteCount),
    description: "AI 回答引用官网或可信资料次数"
  },
  {
    label: "citedOfficialSiteRate 官网引用率",
    value: formatReportPercent(overview.value?.citedOfficialSiteRate),
    description: "覆盖记录中官网引用比例",
    percent: toReportPercent(overview.value?.citedOfficialSiteRate)
  },
  {
    label: "uncoveredTrackedPromptCount 未覆盖追踪词",
    value: formatReportNumber(overview.value?.uncoveredTrackedPromptCount),
    description: "追踪提示词中尚无覆盖记录的数量",
    tone: (overview.value?.uncoveredTrackedPromptCount ?? 0) > 0 ? "warning" : "default"
  }
]);

watch(
  () => ({ ...reportFilters }),
  () => {
    if (loadedTabs[activeTab.value]) {
      refreshCurrentReport();
    }
  },
  { deep: true }
);

watch(suggestionLimit, () => {
  if (activeTab.value === "optimization_suggestions" && loadedTabs.optimization_suggestions) {
    refreshCurrentReport();
  }
});

onMounted(() => {
  void loadReport("geo_overview");
});
</script>

<template>
  <section class="reports-page">
    <header class="reports-hero">
      <div>
        <span class="reports-hero__eyebrow">GEO Review Center</span>
        <h1>GEO 报表</h1>
        <p>
          从提示词资产、内容产出、知识库覆盖和模型覆盖记录中复盘 GEO
          建设进度，判断下一步应该补词、补资料、补内容还是补检测。
        </p>
      </div>
      <div class="reports-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading[activeTab]" @click="refreshCurrentReport">
          刷新当前 Tab
        </el-button>
      </div>
    </header>

    <ReportFilters
      :model-value="reportFilters"
      :loading="loading[activeTab]"
      @update:model-value="Object.assign(reportFilters, $event)"
      @refresh="refreshCurrentReport"
      @reset="resetFilters"
    />

    <el-tabs v-model="activeTab" class="reports-tabs" @tab-change="handleTabChange">
      <el-tab-pane v-for="tab in reportTabs" :key="tab.name" :label="tab.label" :name="tab.name">
        <div class="report-tab-toolbar">
          <div>
            <p class="section-kicker">Report Export</p>
            <h2>{{ tab.label }}</h2>
          </div>
          <ReportExportButton
            :exporting="exporting === tab.name"
            :report-type="tab.name"
            @export="handleExport"
          />
        </div>

        <AppErrorState v-if="errors[tab.name]" title="报表加载失败" :message="errors[tab.name]" />

        <section v-if="tab.name === 'geo_overview'" class="report-panel">
          <div class="report-metric-grid">
            <ReportMetricCard
              v-for="metric in overviewMetrics"
              :key="metric.label"
              :description="metric.description"
              :label="metric.label"
              :loading="loading.geo_overview"
              :percent="metric.percent"
              :tone="metric.tone"
              :value="metric.value"
            />
          </div>
        </section>

        <PromptCoveragePanel
          v-if="tab.name === 'prompt_coverage'"
          :loading="loading.prompt_coverage"
          :report="promptCoverage"
        />
        <ModelCoveragePanel
          v-if="tab.name === 'model_coverage'"
          :loading="loading.model_coverage"
          :report="modelCoverage"
        />
        <ContentCoveragePanel
          v-if="tab.name === 'content_coverage'"
          :loading="loading.content_coverage"
          :report="contentCoverage"
        />
        <KnowledgeCoveragePanel
          v-if="tab.name === 'knowledge_coverage'"
          :loading="loading.knowledge_coverage"
          :report="knowledgeCoverage"
        />
        <section v-if="tab.name === 'optimization_suggestions'" class="report-panel">
          <el-card class="suggestion-limit-card" shadow="never">
            <el-form label-position="top">
              <el-form-item label="limit 优化建议数量">
                <el-input-number v-model="suggestionLimit" :max="200" :min="1" />
              </el-form-item>
            </el-form>
          </el-card>
          <OptimizationSuggestionsPanel
            :loading="loading.optimization_suggestions"
            :suggestions="suggestions"
          />
        </section>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

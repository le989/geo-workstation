<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  exportReport,
  getContentCoverage,
  getGeoHitSummary,
  getGeoOverview,
  getKnowledgeCoverage,
  getModelCoverage,
  getOptimizationSuggestions,
  getPromptCoverage,
  type ContentCoverageReport,
  type GeoHitSummaryReport,
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
import GeoHitSummaryPanel from "@/components/GeoHitSummaryPanel.vue";
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
import { useAuthStore } from "@/stores/auth";
import { canUseAction, normalizeRole } from "@/utils/permission";

type ReportMetric = {
  label: string;
  value: string;
  description: string;
  percent?: number;
  tone?: "default" | "good" | "warning" | "danger";
};
type OverviewConclusionItem = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "good" | "warning" | "danger";
};
type OverviewActionItem = {
  label: string;
  description: string;
  to?: string;
  tab?: ReportTabName;
};

type ReportTabName = ReportExportType | "geo_hit_summary";
type ReportTab = {
  label: string;
  name: ReportTabName;
};
type ReportGroup = {
  key: "overview" | "assets" | "models" | "actions";
  label: string;
  description: string;
  tabs: ReportTab[];
};

const activeTab = ref<ReportTabName>("geo_overview");
const authStore = useAuthStore();
const reportFilters = reactive<ReportQuery>({
  latestOnly: true
});
const suggestionLimit = ref(50);
const lastLoadedAt = ref("");

const overview = ref<GeoOverviewReport | null>(null);
const promptCoverage = ref<PromptCoverageReport | null>(null);
const modelCoverage = ref<ModelCoverageReport | null>(null);
const geoHitSummary = ref<GeoHitSummaryReport | null>(null);
const contentCoverage = ref<ContentCoverageReport | null>(null);
const knowledgeCoverage = ref<KnowledgeCoverageReport | null>(null);
const suggestions = ref<OptimizationSuggestion[]>([]);

const loading = reactive<Record<ReportTabName, boolean>>({
  content_coverage: false,
  geo_hit_summary: false,
  geo_overview: false,
  knowledge_coverage: false,
  model_coverage: false,
  optimization_suggestions: false,
  prompt_coverage: false
});

const errors = reactive<Record<ReportTabName, string>>({
  content_coverage: "",
  geo_hit_summary: "",
  geo_overview: "",
  knowledge_coverage: "",
  model_coverage: "",
  optimization_suggestions: "",
  prompt_coverage: ""
});

const loadedTabs = reactive<Record<ReportTabName, boolean>>({
  content_coverage: false,
  geo_hit_summary: false,
  geo_overview: false,
  knowledge_coverage: false,
  model_coverage: false,
  optimization_suggestions: false,
  prompt_coverage: false
});

const exporting = ref<ReportExportType | "">("");

const normalizedRole = computed(() => {
  const role = String(authStore.currentRole ?? authStore.currentUser?.role ?? "");
  return normalizeRole(role);
});
const isPersonalReportScope = computed(() => normalizedRole.value === "operator");
const canExportReports = computed(() => canUseAction("export", normalizedRole.value));
const reportScopeText = computed(() => {
  const companyName = authStore.currentCompany?.name ?? "当前公司";

  if (isPersonalReportScope.value) {
    return `统计范围：我的数据 · ${companyName}`;
  }
  if (normalizedRole.value === "viewer") {
    return `统计范围：只读 · ${companyName}`;
  }

  return `统计范围：当前公司 · ${companyName}`;
});
const exportScopeText = computed(() =>
  isPersonalReportScope.value ? "导出当前范围：我的数据" : "导出当前公司范围"
);

const reportGroups: ReportGroup[] = [
  {
    key: "overview",
    label: "总览",
    description: "查看 GEO 资产与检测结果的整体情况。",
    tabs: [{ label: "总览", name: "geo_overview" }]
  },
  {
    key: "assets",
    label: "资产覆盖",
    description: "检查提示词、内容和知识库资产是否补齐。",
    tabs: [
      { label: "提示词覆盖", name: "prompt_coverage" },
      { label: "内容覆盖", name: "content_coverage" },
      { label: "知识库覆盖", name: "knowledge_coverage" }
    ]
  },
  {
    key: "models",
    label: "模型结果",
    description: "查看模型检测结果、品牌提及、推荐和竞品占位。",
    tabs: [
      { label: "模型覆盖", name: "model_coverage" },
      { label: "GEO 命中汇总", name: "geo_hit_summary" }
    ]
  },
  {
    key: "actions",
    label: "优化建议",
    description: "根据当前数据生成下一步补齐动作。",
    tabs: [{ label: "优化建议", name: "optimization_suggestions" }]
  }
];
const reportTabs = reportGroups.flatMap((group) => group.tabs);

const buildBaseQuery = (): ReportQuery => ({
  entryPoint: reportFilters.entryPoint,
  from: reportFilters.from,
  model: reportFilters.model?.trim() || undefined,
  platform: reportFilters.platform?.trim() || undefined,
  productLine: reportFilters.productLine?.trim() || undefined,
  to: reportFilters.to
});

const buildGeoHitSummaryQuery = (): ReportQuery => ({
  ...buildBaseQuery(),
  latestOnly: reportFilters.latestOnly ?? true,
  priority: reportFilters.priority,
  trackEnabled: reportFilters.trackEnabled
});

const isExportableReport = (tab: ReportTabName): tab is ReportExportType =>
  tab !== "geo_hit_summary";

const activeReportGroup = computed(
  () =>
    reportGroups.find((group) => group.tabs.some((tab) => tab.name === activeTab.value)) ??
    reportGroups[0]
);
const activeGroupTabs = computed(() => activeReportGroup.value.tabs);
const activeTabMeta = computed(
  () => reportTabs.find((tab) => tab.name === activeTab.value) ?? reportTabs[0]
);

const selectReportGroup = (group: ReportGroup) => {
  const nextTab = group.tabs[0]?.name;
  if (!nextTab || activeTab.value === nextTab) {
    return;
  }

  activeTab.value = nextTab;
  handleTabChange(nextTab);
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.message}。后端未连接时页面仍可访问，请先确认 API 服务是否启动。`;
  }

  return "请求失败。后端未连接时页面仍可访问，请先确认 API 服务是否启动。";
};

const updateLoadedAt = () => {
  lastLoadedAt.value = new Date().toLocaleString();
};

const loadReport = async (tab: ReportTabName) => {
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
    if (tab === "geo_hit_summary") {
      geoHitSummary.value = await getGeoHitSummary(buildGeoHitSummaryQuery());
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
  reportFilters.entryPoint = undefined;
  reportFilters.latestOnly = true;
  reportFilters.model = undefined;
  reportFilters.platform = undefined;
  reportFilters.priority = undefined;
  reportFilters.productLine = undefined;
  reportFilters.trackEnabled = undefined;
  reportFilters.to = undefined;
  refreshCurrentReport();
};

const handleTabChange = (name: string | number) => {
  const tab = name as ReportTabName;
  if (!loadedTabs[tab]) {
    void loadReport(tab);
  }
};

const goToReportTab = (tab: ReportTabName) => {
  activeTab.value = tab;
  handleTabChange(tab);
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
  if (!canExportReports.value) {
    ElMessage.warning("当前角色无权导出报表");
    return;
  }

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
    label: "提示词总量",
    value: formatReportNumber(overview.value?.promptTotal),
    description: "GEO 提示词资产总规模"
  },
  {
    label: "训练词",
    value: formatReportNumber(overview.value?.basePromptCount),
    description: "用于诊断和拓词的基础词"
  },
  {
    label: "蒸馏词",
    value: formatReportNumber(overview.value?.distilledPromptCount),
    description: "用户会向 AI 提问的选择型问法"
  },
  {
    label: "品牌词",
    value: formatReportNumber(overview.value?.brandPromptCount),
    description: "品牌验证和推荐相关提示词"
  },
  {
    label: "场景词",
    value: formatReportNumber(overview.value?.scenePromptCount),
    description: "应用场景驱动的 GEO 问法"
  },
  {
    label: "追踪词",
    value: formatReportNumber(overview.value?.trackedPromptCount),
    description: "需要持续检测模型表现的提示词"
  },
  {
    label: "高优先级词",
    value: formatReportNumber(overview.value?.highPriorityPromptCount),
    description: "优先补检测、内容和资料的提示词",
    tone: "warning"
  },
  {
    label: "知识库",
    value: formatReportNumber(overview.value?.knowledgeBaseCount),
    description: "企业 GEO 知识资产集合"
  },
  {
    label: "知识片段",
    value: formatReportNumber(overview.value?.knowledgeChunkCount),
    description: "可供内容生成引用的事实资料"
  },
  {
    label: "内容任务",
    value: formatReportNumber(overview.value?.contentTaskCount),
    description: "围绕提示词创建的内容任务"
  },
  {
    label: "内容项",
    value: formatReportNumber(overview.value?.contentItemCount),
    description: "已沉淀的 GEO 内容资产"
  },
  {
    label: "失败任务",
    value: formatReportNumber(overview.value?.failedContentTaskCount),
    description: "需要重试或补输入的内容任务",
    tone: (overview.value?.failedContentTaskCount ?? 0) > 0 ? "danger" : "default"
  },
  {
    label: "覆盖记录",
    value: formatReportNumber(overview.value?.modelInclusionRecordCount),
    description: "人工录入或导入的模型表现记录"
  },
  {
    label: "品牌提及",
    value: formatReportNumber(overview.value?.brandMentionedCount),
    description: "AI 回答中提及品牌的次数",
    tone: "good"
  },
  {
    label: "品牌推荐",
    value: formatReportNumber(overview.value?.brandRecommendedCount),
    description: "AI 明确推荐品牌的次数",
    tone: "good"
  },
  {
    label: "品牌提及率",
    value: formatReportPercent(overview.value?.brandMentionRate),
    description: "覆盖记录中提及品牌的比例",
    percent: toReportPercent(overview.value?.brandMentionRate)
  },
  {
    label: "品牌推荐率",
    value: formatReportPercent(overview.value?.brandRecommendRate),
    description: "覆盖记录中推荐品牌的比例",
    percent: toReportPercent(overview.value?.brandRecommendRate)
  },
  {
    label: "官网引用",
    value: formatReportNumber(overview.value?.citedOfficialSiteCount),
    description: "AI 回答引用官网或可信资料次数"
  },
  {
    label: "官网引用率",
    value: formatReportPercent(overview.value?.citedOfficialSiteRate),
    description: "覆盖记录中官网引用比例",
    percent: toReportPercent(overview.value?.citedOfficialSiteRate)
  },
  {
    label: "未覆盖追踪词",
    value: formatReportNumber(overview.value?.uncoveredTrackedPromptCount),
    description: "追踪提示词中尚无覆盖记录的数量",
    tone: (overview.value?.uncoveredTrackedPromptCount ?? 0) > 0 ? "warning" : "default"
  }
]);

const overviewConclusionItems = computed<OverviewConclusionItem[]>(() => [
  {
    label: "未覆盖追踪词",
    value: formatReportNumber(overview.value?.uncoveredTrackedPromptCount),
    hint: "优先补模型检测，避免追踪词长期无结果",
    tone: (overview.value?.uncoveredTrackedPromptCount ?? 0) > 0 ? "warning" : "default"
  },
  {
    label: "失败内容任务",
    value: formatReportNumber(overview.value?.failedContentTaskCount),
    hint: "优先重试或补充知识库输入",
    tone: (overview.value?.failedContentTaskCount ?? 0) > 0 ? "danger" : "default"
  },
  {
    label: "品牌推荐率",
    value: formatReportPercent(overview.value?.brandRecommendRate),
    hint: "核心成功指标，和提及率一起判断 GEO 成效",
    tone: "good"
  },
  {
    label: "知识片段",
    value: formatReportNumber(overview.value?.knowledgeChunkCount),
    hint: "持续补企业事实、参数和可引用资料",
    tone: "default"
  }
]);

const overviewActionItems = computed<OverviewActionItem[]>(() => [
  {
    label: "补知识库",
    description: `${formatReportNumber(overview.value?.knowledgeChunkCount)} 条知识片段支撑内容引用`,
    to: "/knowledge-bases"
  },
  {
    label: "补内容",
    description: `${formatReportNumber(overview.value?.contentTaskCount)} 个任务 / ${formatReportNumber(
      overview.value?.contentItemCount
    )} 篇内容资产`,
    to: "/content-tasks"
  },
  {
    label: "补检测",
    description: `${formatReportNumber(overview.value?.uncoveredTrackedPromptCount)} 个追踪词暂无覆盖记录`,
    to: "/model-inclusion-records"
  },
  {
    label: "看命中汇总",
    description: `推荐率 ${formatReportPercent(overview.value?.brandRecommendRate)} / 提及率 ${formatReportPercent(
      overview.value?.brandMentionRate
    )}`,
    tab: "geo_hit_summary"
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

watch(
  () => authStore.currentCompany?.id,
  (nextCompanyId, previousCompanyId) => {
    if (!nextCompanyId || !previousCompanyId || nextCompanyId === previousCompanyId) {
      return;
    }

    for (const tab of reportTabs) {
      loadedTabs[tab.name] = false;
    }
    void loadReport(activeTab.value);
  }
);

onMounted(() => {
  void loadReport("geo_overview");
});
</script>

<template>
  <section class="reports-page">
    <header class="reports-hero">
      <div class="reports-hero__copy">
        <span class="reports-hero__eyebrow">GEO 复盘中心</span>
        <h1>数据报表</h1>
        <p>
          从提示词资产、内容产出、知识库覆盖和模型覆盖记录中复盘 GEO
          建设进度，判断下一步应该补词、补资料、补内容还是补检测。
        </p>
        <div class="reports-hero__signals" aria-label="GEO 报表重点">
          <span>提示词覆盖</span>
          <span>内容资产</span>
          <span>知识库缺口</span>
          <span>模型结果</span>
        </div>
      </div>
      <div class="reports-hero__actions">
        <el-tag class="reports-scope-tag" effect="plain">{{ reportScopeText }}</el-tag>
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading[activeTab]" @click="refreshCurrentReport">
          刷新当前报表
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

    <section class="reports-tabs report-navigation-shell">
      <div class="report-group-nav" aria-label="GEO 报表分组">
        <button
          v-for="group in reportGroups"
          :key="group.key"
          class="report-group-nav__item"
          :class="{ 'is-active': activeReportGroup.key === group.key }"
          type="button"
          @click="selectReportGroup(group)"
        >
          <strong>{{ group.label }}</strong>
          <span>{{ group.description }}</span>
        </button>
      </div>

      <div class="report-subnav">
        <el-tabs
          v-if="activeGroupTabs.length > 1"
          v-model="activeTab"
          class="reports-sub-tabs"
          @tab-change="handleTabChange"
        >
          <el-tab-pane
            v-for="tab in activeGroupTabs"
            :key="tab.name"
            :label="tab.label"
            :name="tab.name"
          />
        </el-tabs>
        <el-tag v-else effect="plain">{{ activeTabMeta.label }}</el-tag>
      </div>

      <div class="report-tab-toolbar">
        <div>
          <p class="section-kicker">报表导出</p>
          <h2>{{ activeTabMeta.label }}</h2>
        </div>
        <div class="report-export-controls">
          <ReportExportButton
            v-if="isExportableReport(activeTab) && canExportReports"
            :exporting="exporting === activeTab"
            :report-type="activeTab"
            @export="handleExport"
          />
          <el-tag v-else-if="isExportableReport(activeTab)" type="info">当前角色不可导出</el-tag>
          <el-tag v-else type="info">按最新结果口径统计</el-tag>
          <p v-if="isExportableReport(activeTab) && canExportReports" class="report-export-scope">
            {{ exportScopeText }}
          </p>
        </div>
      </div>

      <AppErrorState v-if="errors[activeTab]" title="报表加载失败" :message="errors[activeTab]" />

      <section v-if="activeTab === 'geo_overview'" class="report-panel">
        <div class="report-overview-brief">
          <article class="report-overview-conclusion">
            <p class="section-kicker">本轮结论</p>
            <h3>先判断下一步该补什么</h3>
            <ul>
              <li
                v-for="item in overviewConclusionItems"
                :key="item.label"
                :class="[`is-${item.tone ?? 'default'}`]"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </li>
            </ul>
          </article>

          <article class="report-overview-actions">
            <p class="section-kicker">复盘行动区</p>
            <h3>把报表转成运营动作</h3>
            <div class="report-overview-actions__grid">
              <template v-for="item in overviewActionItems" :key="item.label">
                <RouterLink v-if="item.to" :to="item.to" class="report-overview-action">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.description }}</span>
                </RouterLink>
                <button
                  v-else
                  class="report-overview-action"
                  type="button"
                  @click="goToReportTab(item.tab ?? 'geo_overview')"
                >
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.description }}</span>
                </button>
              </template>
            </div>
          </article>
        </div>

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
        v-if="activeTab === 'prompt_coverage'"
        :loading="loading.prompt_coverage"
        :report="promptCoverage"
      />
      <section v-if="activeTab === 'model_coverage'" class="report-panel">
        <div class="report-inline-note">
          <div>
            <strong>模型覆盖汇总</strong>
            <span>这里展示模型覆盖汇总；原始检测明细请到「模型覆盖记录」查看。</span>
          </div>
          <RouterLink to="/model-inclusion-records">查看原始明细</RouterLink>
        </div>
        <ModelCoveragePanel :loading="loading.model_coverage" :report="modelCoverage" />
      </section>
      <GeoHitSummaryPanel
        v-if="activeTab === 'geo_hit_summary'"
        :loading="loading.geo_hit_summary"
        :report="geoHitSummary"
      />
      <ContentCoveragePanel
        v-if="activeTab === 'content_coverage'"
        :loading="loading.content_coverage"
        :report="contentCoverage"
      />
      <KnowledgeCoveragePanel
        v-if="activeTab === 'knowledge_coverage'"
        :loading="loading.knowledge_coverage"
        :report="knowledgeCoverage"
      />
      <section v-if="activeTab === 'optimization_suggestions'" class="report-panel">
        <div class="report-inline-note report-inline-note--actions">
          <div>
            <strong>运营行动清单</strong>
            <span>保留现有建议合并逻辑，只把缺检测、缺内容、缺资料和失败任务整理成下一步动作。</span>
          </div>
        </div>
        <el-card class="suggestion-limit-card" shadow="never">
          <el-form label-position="top">
            <el-form-item label="优化建议数量">
              <el-input-number v-model="suggestionLimit" :max="200" :min="1" />
            </el-form-item>
          </el-form>
        </el-card>
        <OptimizationSuggestionsPanel
          :loading="loading.optimization_suggestions"
          :suggestions="suggestions"
        />
      </section>
    </section>
  </section>
</template>

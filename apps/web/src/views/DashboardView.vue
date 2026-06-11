<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from "vue";
import {
  ChatDotRound,
  EditPen,
  Files,
  Refresh,
  TrendCharts
} from "@element-plus/icons-vue";
import {
  getGeoOverview,
  getOptimizationSuggestions,
  type GeoOverviewReport,
  type OptimizationSuggestion
} from "@/api/reports";
import AppErrorState from "@/components/AppErrorState.vue";
import DashboardSection from "@/components/DashboardSection.vue";
import QuickActionGrid from "@/components/QuickActionGrid.vue";
import { useAuthStore } from "@/stores/auth";
import { normalizeRole } from "@/utils/permission";

type DashboardTone = "default" | "good" | "warning" | "danger" | "muted";

type DashboardTask = {
  title: string;
  count: string;
  description: string;
  status: string;
  to: string;
  tone: DashboardTone;
  icon: Component;
};

type DashboardListItem = {
  title: string;
  description: string;
  action: string;
  to: string;
};

type DashboardConclusion = {
  title: string;
  description: string;
  weakness: string[];
  primaryAction: {
    title: string;
    action: string;
    to: string;
  };
};

const authStore = useAuthStore();
const overview = ref<GeoOverviewReport | null>(null);
const suggestions = ref<OptimizationSuggestion[]>([]);
const loading = ref(false);
const overviewError = ref("");
const suggestionsError = ref("");
const lastLoadedAt = ref("");

const emptyOverview: GeoOverviewReport = {
  basePromptCount: 0,
  brandMentionRate: 0,
  brandMentionedCount: 0,
  brandPromptCount: 0,
  brandRecommendRate: 0,
  brandRecommendedCount: 0,
  citedOfficialSiteCount: 0,
  citedOfficialSiteRate: 0,
  citedContentAssetCount: 0,
  citedContentAssetRate: 0,
  competitorMentionedCount: 0,
  competitorMentionRate: 0,
  contentItemCount: 0,
  contentTaskCount: 0,
  distilledPromptCount: 0,
  failedContentTaskCount: 0,
  highPriorityPromptCount: 0,
  knowledgeBaseCount: 0,
  knowledgeChunkCount: 0,
  modelInclusionRecordCount: 0,
  promptTotal: 0,
  scenePromptCount: 0,
  trackedPromptCount: 0,
  uncoveredTrackedPromptCount: 0
};

const report = computed(() => overview.value ?? emptyOverview);
const hasOverviewError = computed(() => Boolean(overviewError.value));
const isInitialLoading = computed(() => loading.value && !overview.value);
const normalizedRole = computed(() => {
  const role = String(authStore.currentRole ?? authStore.currentUser?.role ?? "");
  return normalizeRole(role);
});
const dashboardScopeText = computed(() => {
  const companyName = authStore.currentCompany?.name ?? "当前公司";

  if (normalizedRole.value === "operator") {
    return `统计范围：我的数据 · ${companyName}`;
  }
  if (normalizedRole.value === "viewer") {
    return `统计范围：只读 · ${companyName}`;
  }

  return `统计范围：当前公司 · ${companyName}`;
});

const formatNumber = (value: number | undefined | null) => `${value ?? 0}`;

const formatPercent = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
};

const getPercentValue = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value * 100));
};

const getCountTone = (value: number, warningThreshold = 1) => {
  if (value >= warningThreshold) {
    return "warning" as const;
  }

  return "default" as const;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.message}。后端未连接，可先启动 API 服务。`;
  }

  return "后端未连接，可先启动 API 服务。";
};

const getMissRate = () => {
  if (report.value.modelInclusionRecordCount <= 0) {
    return 0;
  }

  return Math.max(0, 1 - (report.value.brandMentionRate ?? 0));
};

const loadDashboard = async () => {
  loading.value = true;
  overviewError.value = "";
  suggestionsError.value = "";

  const [overviewResult, suggestionsResult] = await Promise.allSettled([
    getGeoOverview(),
    getOptimizationSuggestions({ limit: 8 })
  ]);

  if (overviewResult.status === "fulfilled") {
    overview.value = overviewResult.value;
  } else {
    overviewError.value = getErrorMessage(overviewResult.reason);
  }

  if (suggestionsResult.status === "fulfilled") {
    suggestions.value = suggestionsResult.value.items.slice(0, 8);
  } else {
    suggestionsError.value = getErrorMessage(suggestionsResult.reason);
  }

  if (overviewResult.status === "fulfilled" || suggestionsResult.status === "fulfilled") {
    lastLoadedAt.value = new Date().toLocaleString();
  }

  loading.value = false;
};

onMounted(() => {
  void loadDashboard();
});

watch(
  () => authStore.currentCompany?.id,
  (nextCompanyId, previousCompanyId) => {
    if (!nextCompanyId || !previousCompanyId || nextCompanyId === previousCompanyId) {
      return;
    }

    void loadDashboard();
  }
);

const secondaryMetrics = computed(() => [
  {
    label: "GEO 提示词",
    value: formatNumber(report.value.promptTotal),
    description: `${report.value.trackedPromptCount} 追踪 / ${report.value.highPriorityPromptCount} 高优先级`,
    to: "/geo-prompts"
  },
  {
    label: "知识库",
    value: formatNumber(report.value.knowledgeBaseCount),
    description: `${report.value.knowledgeChunkCount} 条片段`,
    to: "/knowledge-bases"
  },
  {
    label: "发布文章",
    value: `${formatNumber(report.value.contentTaskCount)} / ${formatNumber(report.value.contentItemCount)}`,
    description:
      report.value.failedContentTaskCount > 0
        ? `${report.value.failedContentTaskCount} 个失败任务待处理`
        : "暂无失败任务",
    to: "/geo-content"
  },
  {
    label: "检测记录",
    value: formatNumber(report.value.modelInclusionRecordCount),
    description: `竞品提及率 ${formatPercent(report.value.competitorMentionRate)}`,
    to: "/model-inclusion-records"
  }
]);

const normalizeSuggestionProductLine = (item: OptimizationSuggestion) =>
  item.relatedProductLine?.trim() || "默认产品线";

const getGroupedSuggestionTitle = (
  item: OptimizationSuggestion,
  productLine: string,
  count: number
) => {
  if (item.type === "product_line_without_knowledge") {
    return `${productLine}缺少知识库资料`;
  }

  if (item.type === "prompt_without_record") {
    return `${productLine}有 ${count} 个词待补检测`;
  }

  if (item.type === "prompt_without_content") {
    return `${productLine}有 ${count} 个词缺内容`;
  }

  if (item.type === "prompt_not_mentioned") {
    return `${productLine}有 ${count} 个词未命中品牌`;
  }

  return count > 1 ? `${count} 个内容任务失败` : item.title;
};

const getGroupedSuggestionReason = (
  item: OptimizationSuggestion,
  productLine: string,
  count: number
) => {
  if (count <= 1) {
    return item.reason;
  }

  if (item.type === "product_line_without_knowledge") {
    return `合并 ${count} 条相似建议：${productLine}资料不足会影响内容生成和命中判断。`;
  }

  if (item.type === "prompt_without_record") {
    return `合并 ${count} 条相似建议：这些词缺少检测记录，报表判断会偏弱。`;
  }

  if (item.type === "prompt_without_content") {
    return `合并 ${count} 条相似建议：这些词缺少内容资产支撑。`;
  }

  if (item.type === "prompt_not_mentioned") {
    return `合并 ${count} 条相似建议：这些词需要补品牌内容或外部资料。`;
  }

  return `合并 ${count} 条相似建议：优先处理失败任务。`;
};

const getGroupedSuggestionAction = (item: OptimizationSuggestion) => {
  if (item.type === "product_line_without_knowledge") {
    return "去知识库补资料";
  }

  if (item.type === "prompt_without_record") {
    return "去补检测记录";
  }

  if (item.type === "prompt_without_content" || item.type === "prompt_not_mentioned") {
    return "去生成内容";
  }

  return item.suggestedAction || "去发布文章工作台处理";
};

const groupedSuggestionPreview = computed<OptimizationSuggestion[]>(() => {
  const groups = new Map<string, OptimizationSuggestion[]>();

  suggestions.value.forEach((item) => {
    const productLine = normalizeSuggestionProductLine(item);
    const key = `${item.type}-${productLine}-${item.relatedModel ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.values())
    .map((items) => {
      const [first] = items;
      const productLine = normalizeSuggestionProductLine(first);

      return {
        ...first,
        priority: Math.max(...items.map((item) => item.priority)),
        title: getGroupedSuggestionTitle(first, productLine, items.length),
        reason: getGroupedSuggestionReason(first, productLine, items.length),
        suggestedAction: getGroupedSuggestionAction(first),
        relatedPromptText:
          items.length > 1 ? `已合并 ${items.length} 条相似建议` : first.relatedPromptText,
        relatedProductLine: productLine
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
});

const uncoveredProblemItems = computed<DashboardListItem[]>(() =>
  groupedSuggestionPreview.value
    .filter((item) =>
      ["prompt_without_record", "prompt_without_content", "prompt_not_mentioned"].includes(item.type)
    )
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      description: item.reason,
      action: item.suggestedAction,
      to:
        item.type === "prompt_without_record" || item.type === "prompt_not_mentioned"
          ? "/model-inclusion-records"
          : "/geo-content"
    }))
);

const knowledgeGapItems = computed<DashboardListItem[]>(() =>
  groupedSuggestionPreview.value
    .filter((item) => item.type === "product_line_without_knowledge")
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      description: item.reason,
      action: item.suggestedAction,
      to: "/knowledge-bases"
    }))
);

const contentGapCount = computed(
  () =>
    groupedSuggestionPreview.value.filter((item) =>
      ["prompt_without_content", "prompt_not_mentioned"].includes(item.type)
    ).length
);

const visibilityMetrics = computed(() => [
  {
    label: "品牌推荐率",
    value: formatPercent(report.value.brandRecommendRate),
    status: report.value.brandRecommendRate > 0 ? "有推荐" : "待提升",
    percent: getPercentValue(report.value.brandRecommendRate),
    to: "/geo-reports",
    tone: report.value.brandRecommendRate > 0 ? ("good" as DashboardTone) : ("warning" as DashboardTone)
  },
  {
    label: "品牌提及率",
    value: formatPercent(report.value.brandMentionRate),
    status: report.value.brandMentionRate > 0 ? "已提及" : "待覆盖",
    percent: getPercentValue(report.value.brandMentionRate),
    to: "/geo-reports",
    tone: "good" as DashboardTone
  },
  {
    label: "官网引用率",
    value: formatPercent(report.value.citedOfficialSiteRate),
    status: report.value.citedOfficialSiteRate > 0 ? "有引用" : "待补证",
    percent: getPercentValue(report.value.citedOfficialSiteRate),
    to: "/model-inclusion-records",
    tone: "default" as DashboardTone
  },
  {
    label: "竞品占位率",
    value: formatPercent(report.value.competitorMentionRate),
    status: report.value.competitorMentionedCount > 0 ? "需复盘" : "低占位",
    percent: getPercentValue(report.value.competitorMentionRate),
    to: "/model-inclusion-records",
    tone: getCountTone(report.value.competitorMentionedCount)
  },
  {
    label: "待补救问题",
    value: formatNumber(
      report.value.uncoveredTrackedPromptCount +
        knowledgeGapItems.value.length +
        contentGapCount.value +
        report.value.failedContentTaskCount
    ),
    description: "汇总待补问法、证据、文章和复盘项",
    percent: Math.min(
      100,
      (report.value.uncoveredTrackedPromptCount +
        knowledgeGapItems.value.length +
        contentGapCount.value +
        report.value.failedContentTaskCount) *
        20
    ),
    status:
      report.value.uncoveredTrackedPromptCount +
        knowledgeGapItems.value.length +
        contentGapCount.value +
        report.value.failedContentTaskCount >
      0
        ? "待处理"
        : "稳定",
    to: "/model-inclusion-records",
    tone: getCountTone(
      report.value.uncoveredTrackedPromptCount +
        knowledgeGapItems.value.length +
        contentGapCount.value +
        report.value.failedContentTaskCount
    )
  }
]);

const getPrimaryRecoveryAction = () => {
  if (report.value.uncoveredTrackedPromptCount > 0) {
    return {
      title: "先复盘模型覆盖",
      description: "有追踪问法还缺检测记录，先补模型覆盖结果，再判断补问法、证据或文章。",
      action: "去模型覆盖记录",
      to: "/model-inclusion-records"
    };
  }

  if (knowledgeGapItems.value.length > 0) {
    return {
      title: "先补知识库证据",
      description: "当前建议里已有知识库缺口，优先补产品参数、场景、案例等可引用资料。",
      action: "去知识库",
      to: "/knowledge-bases"
    };
  }

  if (contentGapCount.value > 0 || report.value.failedContentTaskCount > 0) {
    return {
      title: "先补发布文章",
      description: "已有问法或内容任务需要补内容资产，优先处理 AI 引用友好度和发布稿。",
      action: "去发布文章",
      to: "/geo-content"
    };
  }

  return {
    title: "继续补真实问法",
    description: "当前没有明显阻断项，可以从用户真实问法和拓词候选继续扩展覆盖面。",
    action: "去提示词库",
    to: "/geo-prompts"
  };
};

const dashboardConclusion = computed<DashboardConclusion>(() => {
  const primaryAction = getPrimaryRecoveryAction();
  const weakness: string[] = [];

  // 结论只基于当前总览字段做运营提示，不写入数据也不替代人工判断。
  if (report.value.brandRecommendedCount <= 0) {
    weakness.push("品牌推荐仍需补强");
  }
  if (report.value.citedOfficialSiteCount <= 0) {
    weakness.push("官网引用需要继续补可引用段落");
  }
  if (report.value.uncoveredTrackedPromptCount > 0) {
    weakness.push("部分追踪问法缺少模型覆盖记录");
  }
  if (knowledgeGapItems.value.length > 0) {
    weakness.push("知识库证据存在缺口");
  }
  if (contentGapCount.value > 0 || report.value.failedContentTaskCount > 0) {
    weakness.push("发布文章和内容资产需要补齐");
  }
  if (report.value.competitorMentionedCount > 0) {
    weakness.push("存在竞品占位，需要单条记录复盘");
  }

  const title =
    report.value.brandMentionedCount > 0
      ? "品牌已被提及，推荐和引用仍需持续补强"
      : "品牌提及不足，先补问法、证据和模型覆盖";

  return {
    title,
    description:
      report.value.modelInclusionRecordCount > 0
        ? `当前 ${formatNumber(report.value.brandRecommendedCount)} / ${formatNumber(report.value.modelInclusionRecordCount)} 条覆盖记录推荐品牌。`
        : "当前缺少模型覆盖记录，先补检测结果再判断真实可见度。",
    weakness: weakness.length > 0 ? weakness.slice(0, 4) : ["当前没有明显阻断项，继续扩大真实问法覆盖。"],
    primaryAction: {
      title: primaryAction.title,
      action: primaryAction.action,
      to: primaryAction.to
    }
  };
});

const todayTasks = computed<DashboardTask[]>(() => [
  {
    title: "补问法",
    count: formatNumber(report.value.promptTotal),
    description: "真实用户问题不足时，先去提示词库或 AI 拓词补问法。",
    status: `${formatNumber(report.value.trackedPromptCount)} 追踪`,
    to: "/geo-prompts",
    tone: report.value.promptTotal > 0 ? "default" : "warning",
    icon: ChatDotRound
  },
  {
    title: "补证据",
    count: formatNumber(knowledgeGapItems.value.length),
    description: "资料不足时，先补产品参数、场景、案例和可引用证据。",
    status: knowledgeGapItems.value.length > 0 ? "有缺口" : "正常",
    to: "/knowledge-bases",
    tone: getCountTone(knowledgeGapItems.value.length),
    icon: Files
  },
  {
    title: "补文章",
    count: formatNumber(contentGapCount.value + report.value.failedContentTaskCount),
    description: "内容不足时，优先处理发布稿和 AI 引用友好检查。",
    status: contentGapCount.value + report.value.failedContentTaskCount > 0 ? "待处理" : "正常",
    to: "/geo-content",
    tone:
      contentGapCount.value + report.value.failedContentTaskCount > 0 ? "warning" : "default",
    icon: EditPen
  },
  {
    title: "复盘模型",
    count: formatNumber(report.value.uncoveredTrackedPromptCount),
    description: "未推荐或未命中时，展开覆盖记录看未推荐原因复盘。",
    status: report.value.uncoveredTrackedPromptCount > 0 ? "待处理" : "正常",
    to: "/model-inclusion-records",
    tone: getCountTone(report.value.uncoveredTrackedPromptCount),
    icon: TrendCharts
  }
]);

const dashboardTaskTotal = computed(
  () =>
    knowledgeGapItems.value.length +
    contentGapCount.value +
    report.value.failedContentTaskCount +
    report.value.uncoveredTrackedPromptCount
);

const recentActivities = computed(() => [
  {
    time: "当前",
    title: "生成文章",
    description: `当前共有 ${formatNumber(report.value.contentItemCount)} 篇内容资产。`,
    meta: "来自总览接口"
  },
  {
    time: "当前",
    title: "新增知识库资料",
    description: `当前沉淀 ${formatNumber(report.value.knowledgeChunkCount)} 条知识片段。`,
    meta: "来自总览接口"
  },
  {
    time: "当前",
    title: "模型覆盖记录更新",
    description: `当前累计 ${formatNumber(report.value.modelInclusionRecordCount)} 条覆盖记录。`,
    meta: "来自总览接口"
  },
  {
    time: "待办",
    title: "待补检测提醒",
    description: `${formatNumber(report.value.uncoveredTrackedPromptCount)} 个追踪词仍需补检测。`,
    meta: "当前数据摘要"
  }
]);

const modelComparisonRows = [
  { label: "豆包", mentioned: 72, recommended: 46, missed: 28 },
  { label: "通义 / 千问", mentioned: 64, recommended: 38, missed: 36 },
  { label: "Kimi", mentioned: 58, recommended: 31, missed: 42 }
];

const reasonDistributionItems = [
  { label: "证据不足", value: 28, color: "#2563eb", action: "补知识库证据" },
  { label: "问法覆盖不足", value: 22, color: "#0891b2", action: "补真实问法" },
  { label: "文章引用友好度不足", value: 18, color: "#0d9488", action: "优化发布文章" },
  { label: "竞品占位", value: 14, color: "#d97706", action: "复盘竞品原因" },
  { label: "官网引用弱", value: 10, color: "#64748b", action: "补官网可引用段落" },
  { label: "模型未抓取", value: 8, color: "#94a3b8", action: "重新复测" }
];

const scenarioTags = [
  { label: "粉尘", size: "large" },
  { label: "水汽", size: "medium" },
  { label: "激光测距", size: "large" },
  { label: "料位", size: "medium" },
  { label: "防撞", size: "medium" },
  { label: "替代 ifm", size: "large" },
  { label: "长距离检测", size: "medium" },
  { label: "AGV", size: "small" },
  { label: "反光物体", size: "small" },
  { label: "输出方式", size: "medium" }
];
</script>

<template>
  <section class="dashboard-refresh-page">
    <header class="dashboard-refresh-header">
      <div class="dashboard-refresh-title-block">
        <p>工作台</p>
        <h1>AI 可见度驾驶舱</h1>
        <span>{{ dashboardScopeText }}</span>
      </div>
      <div class="dashboard-refresh-header-actions">
        <small>本地 smoke 数据 · 非正式线上结论</small>
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadDashboard">
          刷新
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="hasOverviewError" title="GEO 总览加载失败" :message="overviewError" />

    <section class="dashboard-refresh-kpi-grid" aria-label="核心品牌表现指标">
      <RouterLink
        v-for="metric in visibilityMetrics"
        :key="metric.label"
        :to="metric.to"
        :class="['dashboard-refresh-kpi-card', `dashboard-refresh-card--${metric.tone}`]"
      >
        <el-skeleton v-if="isInitialLoading" animated :rows="2" />
        <template v-else>
          <div class="dashboard-refresh-kpi-label-row">
            <span>{{ metric.label }}</span>
          </div>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.status }}</small>
        </template>
      </RouterLink>
    </section>

    <section class="dashboard-refresh-core-grid">
      <article class="dashboard-refresh-panel dashboard-refresh-trend-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>AI 可见度趋势</h2>
          </div>
        </div>
        <svg viewBox="0 0 720 260" role="img" aria-label="AI 可见度示例趋势图">
          <path class="dashboard-refresh-grid-line" d="M36 42H690" />
          <path class="dashboard-refresh-grid-line" d="M36 96H690" />
          <path class="dashboard-refresh-grid-line" d="M36 150H690" />
          <path class="dashboard-refresh-grid-line" d="M36 204H690" />
          <path class="dashboard-refresh-grid-line dashboard-refresh-grid-line--vertical" d="M146 42V218" />
          <path class="dashboard-refresh-grid-line dashboard-refresh-grid-line--vertical" d="M256 42V218" />
          <path class="dashboard-refresh-grid-line dashboard-refresh-grid-line--vertical" d="M366 42V218" />
          <path class="dashboard-refresh-grid-line dashboard-refresh-grid-line--vertical" d="M476 42V218" />
          <path class="dashboard-refresh-grid-line dashboard-refresh-grid-line--vertical" d="M586 42V218" />
          <path class="dashboard-refresh-chart-line dashboard-refresh-chart-line--mention" d="M38 194C112 168 146 150 224 132C310 112 376 120 452 88C538 52 608 64 688 36" />
          <path class="dashboard-refresh-chart-line dashboard-refresh-chart-line--recommend" d="M38 214C120 198 160 178 230 166C312 150 386 132 464 106C540 78 606 88 688 72" />
          <path class="dashboard-refresh-chart-line dashboard-refresh-chart-line--cite" d="M38 226C118 218 172 200 238 188C310 174 390 168 464 142C548 112 608 126 688 102" />
          <path class="dashboard-refresh-chart-line dashboard-refresh-chart-line--miss" d="M38 74C116 88 166 112 236 130C318 150 392 156 466 174C548 192 616 188 688 202" />
          <g class="dashboard-refresh-axis-labels" aria-hidden="true">
            <text x="36" y="244">D-6</text>
            <text x="146" y="244">D-5</text>
            <text x="256" y="244">D-4</text>
            <text x="366" y="244">D-3</text>
            <text x="476" y="244">D-2</text>
            <text x="586" y="244">D-1</text>
            <text x="668" y="244">今日</text>
            <text x="8" y="46">高</text>
            <text x="8" y="208">低</text>
          </g>
        </svg>
        <div class="dashboard-refresh-chart-legend">
          <span><i class="dashboard-refresh-dot--mention" />品牌提及率 {{ formatPercent(report.brandMentionRate) }}</span>
          <span><i class="dashboard-refresh-dot--recommend" />品牌推荐率 {{ formatPercent(report.brandRecommendRate) }}</span>
          <span><i class="dashboard-refresh-dot--cite" />官网引用率 {{ formatPercent(report.citedOfficialSiteRate) }}</span>
          <span><i class="dashboard-refresh-dot--miss" />未命中率 {{ formatPercent(getMissRate()) }}</span>
        </div>
      </article>

      <article class="dashboard-refresh-panel dashboard-refresh-ops-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>待处理</h2>
          </div>
          <RouterLink :to="dashboardConclusion.primaryAction.to">
            {{ dashboardConclusion.primaryAction.action }}
          </RouterLink>
        </div>
        <div class="dashboard-refresh-ops-summary">
          <strong>{{ dashboardTaskTotal }} 项待复盘</strong>
          <span>推荐、证据、文章和模型记录</span>
        </div>
        <ul class="dashboard-refresh-action-list" aria-label="高优待办">
          <li v-for="task in todayTasks" :key="task.title">
            <RouterLink
              :to="task.to"
              :class="['dashboard-refresh-action-row', `dashboard-refresh-card--${task.tone}`]"
            >
              <span class="dashboard-refresh-action-main">
                <i
                  :class="[
                    'status-dot',
                    task.tone === 'danger'
                      ? 'status-dot--danger'
                      : task.tone === 'warning'
                        ? 'status-dot--warning'
                        : 'status-dot--success'
                  ]"
                  aria-hidden="true"
                />
                <el-icon>
                  <component :is="task.icon" />
                </el-icon>
                <strong>{{ task.title }}</strong>
                <small>{{ task.count }}</small>
              </span>
              <b>{{ task.status }}</b>
              <em>去处理</em>
            </RouterLink>
          </li>
        </ul>
      </article>
    </section>

    <section class="dashboard-refresh-diagnostic-grid" aria-label="辅助诊断分析">
      <article class="dashboard-refresh-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>模型推荐对比</h2>
          </div>
        </div>
        <div class="dashboard-refresh-model-bars">
          <article v-for="model in modelComparisonRows" :key="model.label">
            <strong>{{ model.label }}</strong>
            <div>
              <span>提及</span>
              <i><b class="dashboard-refresh-bar--mention" :style="{ width: `${model.mentioned}%` }" /></i>
              <em>{{ model.mentioned }}%</em>
            </div>
            <div>
              <span>推荐</span>
              <i><b class="dashboard-refresh-bar--recommend" :style="{ width: `${model.recommended}%` }" /></i>
              <em>{{ model.recommended }}%</em>
            </div>
            <div>
              <span>未推荐</span>
              <i><b class="dashboard-refresh-bar--miss" :style="{ width: `${model.missed}%` }" /></i>
              <em>{{ model.missed }}%</em>
            </div>
          </article>
        </div>
      </article>

      <article class="dashboard-refresh-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>未推荐原因分布</h2>
          </div>
        </div>
        <div class="dashboard-refresh-reason-list">
          <div v-for="item in reasonDistributionItems" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}%</strong>
            <i>
              <b :style="{ width: `${item.value}%`, background: item.color }" />
            </i>
            <small>{{ item.action }}</small>
          </div>
        </div>
      </article>

      <article class="dashboard-refresh-panel dashboard-refresh-tag-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>高频问法 / 场景词</h2>
          </div>
        </div>
        <div class="dashboard-refresh-tag-cloud">
          <span
            v-for="tag in scenarioTags"
            :key="tag.label"
            :class="`dashboard-refresh-tag--${tag.size}`"
          >
            {{ tag.label }}
          </span>
        </div>
      </article>
    </section>

    <DashboardSection
      class="dashboard-refresh-section dashboard-refresh-section--compact"
      title="辅助信息"
    >
      <section class="dashboard-refresh-lists-grid">
        <article class="dashboard-refresh-panel">
          <div class="dashboard-refresh-panel-header">
            <div>
              <h2>未覆盖问题 TOP 5</h2>
            </div>
          </div>
          <AppErrorState v-if="suggestionsError" title="待优化建议加载失败" :message="suggestionsError" />
          <div v-else-if="uncoveredProblemItems.length" class="dashboard-refresh-rank-list">
            <RouterLink v-for="item in uncoveredProblemItems" :key="item.title" :to="item.to">
              <strong>{{ item.title }}</strong>
              <span>{{ item.action }}</span>
            </RouterLink>
          </div>
          <div v-else class="dashboard-refresh-compact-empty">
            <strong>暂无未覆盖问题排行</strong>
            <small>当前接口没有返回可展示项，未使用示例问题填充。</small>
          </div>
        </article>

        <article class="dashboard-refresh-panel">
          <div class="dashboard-refresh-panel-header">
            <div>
              <h2>知识库缺口 TOP 5</h2>
            </div>
          </div>
          <div v-if="knowledgeGapItems.length" class="dashboard-refresh-rank-list">
            <RouterLink v-for="item in knowledgeGapItems" :key="item.title" :to="item.to">
              <strong>{{ item.title }}</strong>
              <span>{{ item.action }}</span>
            </RouterLink>
          </div>
          <div v-else class="dashboard-refresh-compact-empty">
            <strong>暂无知识库缺口排行</strong>
            <small>当前接口没有返回可展示项，未使用示例缺口填充。</small>
          </div>
        </article>

        <article class="dashboard-refresh-panel">
          <div class="dashboard-refresh-panel-header">
            <div>
              <h2>最近动态</h2>
            </div>
          </div>
          <div class="dashboard-refresh-activity-list">
            <article v-for="activity in recentActivities" :key="activity.title">
              <time>{{ activity.time }}</time>
              <div>
                <span>{{ activity.title }}</span>
                <strong>{{ activity.description }}</strong>
                <small>{{ activity.meta }}</small>
              </div>
            </article>
          </div>
        </article>
      </section>
    </DashboardSection>

    <DashboardSection
      class="dashboard-refresh-section"
      title="辅助统计"
    >
      <div class="dashboard-refresh-secondary-grid">
        <RouterLink v-for="metric in secondaryMetrics" :key="metric.label" :to="metric.to">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </RouterLink>
      </div>
    </DashboardSection>

    <DashboardSection
      class="dashboard-refresh-section"
      title="处理入口"
    >
      <QuickActionGrid />
      <div class="dashboard-refresh-boundary-note">
        <span>当前为内部使用版本，关键发布和参数事实仍需人工确认。</span>
        <RouterLink to="/help">查看使用教程</RouterLink>
      </div>
    </DashboardSection>
  </section>
</template>

<style scoped>
.dashboard-refresh-page {
  display: grid;
  gap: 12px;
  color: #172331;
  --el-color-primary: #2563eb;
  --el-color-primary-light-3: #5b8def;
  --el-color-primary-light-5: #93b6f6;
  --el-color-primary-light-7: #c7dafb;
  --el-color-primary-light-9: #edf4ff;
}

.dashboard-refresh-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.dashboard-refresh-title-block {
  min-width: 0;
}

.dashboard-refresh-header p,
.dashboard-refresh-panel-header p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.dashboard-refresh-header h1 {
  margin: 3px 0 0;
  color: #111827;
  font-size: clamp(20px, 2.1vw, 26px);
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.2;
}

.dashboard-refresh-header span {
  display: block;
  margin-top: 3px;
  color: #7c8da3;
  font-size: 12px;
}

.dashboard-refresh-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.dashboard-refresh-header-actions span {
  margin: 0;
}

.dashboard-refresh-header-actions small {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 9px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f8fafc;
  color: #52647a;
  font-size: 12px;
  font-weight: 600;
}

.dashboard-refresh-kpi-grid,
.dashboard-refresh-core-grid,
.dashboard-refresh-diagnostic-grid,
.dashboard-refresh-lists-grid,
.dashboard-refresh-secondary-grid {
  display: grid;
  gap: 10px;
}

.dashboard-refresh-kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
}

.dashboard-refresh-kpi-card,
.dashboard-refresh-panel,
.dashboard-refresh-secondary-grid a {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.dashboard-refresh-kpi-card,
.dashboard-refresh-action-row,
.dashboard-refresh-rank-list a,
.dashboard-refresh-secondary-grid a {
  color: inherit;
  text-decoration: none;
}

.dashboard-refresh-kpi-card {
  display: grid;
  gap: 4px;
  min-height: 68px;
  padding: 9px 11px;
}

.dashboard-refresh-kpi-card span,
.dashboard-refresh-secondary-grid span {
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
}

.dashboard-refresh-kpi-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dashboard-refresh-kpi-card strong {
  color: #111827;
  font-size: 22px;
  font-weight: 820;
  line-height: 1;
}

.dashboard-refresh-kpi-card p,
.dashboard-refresh-secondary-grid p {
  margin: 0;
  color: #5d6f86;
  font-size: 13px;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.dashboard-refresh-kpi-card small {
  color: #8796aa;
  font-size: 12px;
}

.dashboard-refresh-card--danger {
  border-color: #f0c8c2;
}

.dashboard-refresh-card--warning {
  border-color: #efd9af;
}

.dashboard-refresh-card--muted {
  border-color: #e5eaf1;
  background: #fbfcfe;
}

.dashboard-refresh-core-grid {
  grid-template-columns: minmax(0, 1.85fr) minmax(320px, 1fr);
  align-items: stretch;
}

.dashboard-refresh-diagnostic-grid {
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr) minmax(260px, 0.86fr);
}

.dashboard-refresh-lists-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
}

.dashboard-refresh-panel {
  min-width: 0;
  padding: 10px 12px;
}

.dashboard-refresh-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.dashboard-refresh-panel-header h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 760;
  line-height: 1.35;
}

.dashboard-refresh-panel-header a {
  flex: 0 0 auto;
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.dashboard-refresh-soft-note {
  flex: 0 0 auto;
  color: #7c8da3;
  font-size: 12px;
  font-weight: 600;
}

.dashboard-refresh-ops-panel {
  display: grid;
  gap: 10px;
  align-content: start;
}

.dashboard-refresh-ops-summary {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
}

.dashboard-refresh-ops-summary strong {
  color: #111827;
  font-size: 16px;
  line-height: 1.35;
}

.dashboard-refresh-ops-summary span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
}

.dashboard-refresh-ops-summary p {
  margin: 0;
  color: #52647a;
  font-size: 13px;
  line-height: 1.5;
}

.dashboard-refresh-weakness-list,
.dashboard-refresh-action-list {
  display: grid;
  gap: 6px;
}

.dashboard-refresh-action-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-refresh-weakness-list {
  display: flex;
  flex-wrap: wrap;
}

.dashboard-refresh-weakness-list span {
  min-width: 0;
  padding: 4px 7px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1e3a5f;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
}

.dashboard-refresh-action-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 7px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.dashboard-refresh-action-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.dashboard-refresh-action-main .status-dot {
  width: 7px;
  height: 7px;
}

.dashboard-refresh-action-row .el-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 4px;
  background: #eef4ff;
  color: #0070f3;
  font-size: 14px;
}

.dashboard-refresh-action-row strong {
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-refresh-action-row small {
  color: #65758a;
  font-size: 12px;
}

.dashboard-refresh-action-row b {
  width: fit-content;
  padding: 4px 7px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #52647a;
  font-size: 12px;
  white-space: nowrap;
}

.dashboard-refresh-action-row em {
  padding: 4px 8px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  color: #2563eb;
  font-size: 12px;
  font-style: normal;
  font-weight: 650;
  white-space: nowrap;
}

.dashboard-refresh-trend-panel svg {
  display: block;
  width: 100%;
  max-height: 260px;
  height: auto;
}

.dashboard-refresh-grid-line {
  stroke: #e7edf5;
  stroke-width: 1;
}

.dashboard-refresh-grid-line--vertical {
  stroke: #eef3f9;
}

.dashboard-refresh-chart-line {
  fill: none;
  stroke-linecap: round;
  stroke-width: 6;
}

.dashboard-refresh-axis-labels text {
  fill: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.dashboard-refresh-chart-line--mention,
.dashboard-refresh-dot--mention {
  stroke: #2563eb;
  background: #2563eb;
}

.dashboard-refresh-chart-line--recommend,
.dashboard-refresh-dot--recommend {
  stroke: #0891b2;
  background: #0891b2;
}

.dashboard-refresh-chart-line--cite,
.dashboard-refresh-dot--cite {
  stroke: #059669;
  background: #059669;
}

.dashboard-refresh-chart-line--miss,
.dashboard-refresh-dot--miss {
  stroke: #d97706;
  background: #d97706;
}

.dashboard-refresh-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.dashboard-refresh-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #52647a;
  font-size: 13px;
  font-weight: 700;
}

.dashboard-refresh-chart-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dashboard-refresh-model-bars,
.dashboard-refresh-reason-list,
.dashboard-refresh-activity-list,
.dashboard-refresh-rank-list {
  display: grid;
  gap: 10px;
}

.dashboard-refresh-model-bars article {
  display: grid;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.dashboard-refresh-model-bars article > strong {
  color: #111827;
  font-size: 14px;
}

.dashboard-refresh-model-bars article > div,
.dashboard-refresh-reason-list div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 42px;
  gap: 8px;
  align-items: center;
}

.dashboard-refresh-model-bars span,
.dashboard-refresh-reason-list span {
  color: #52647a;
  font-size: 13px;
  font-weight: 650;
}

.dashboard-refresh-model-bars i,
.dashboard-refresh-reason-list i {
  overflow: hidden;
  height: 9px;
  border-radius: 999px;
  background: #edf2f7;
}

.dashboard-refresh-model-bars b,
.dashboard-refresh-reason-list b {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.dashboard-refresh-model-bars em,
.dashboard-refresh-reason-list strong {
  color: #111827;
  font-style: normal;
  font-weight: 700;
}

.dashboard-refresh-bar--mention {
  background: #2563eb;
}

.dashboard-refresh-bar--recommend {
  background: #059669;
}

.dashboard-refresh-bar--miss {
  background: #d97706;
}

.dashboard-refresh-reason-list div {
  grid-template-columns: 116px minmax(0, 1fr) 42px;
}

.dashboard-refresh-reason-list small {
  grid-column: 2 / -1;
  color: #7c8da3;
  font-size: 12px;
}

.dashboard-refresh-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dashboard-refresh-tag-cloud span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 9px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 650;
}

.dashboard-refresh-tag--small {
  font-size: 12px;
}

.dashboard-refresh-tag--medium {
  font-size: 14px;
}

.dashboard-refresh-tag--large {
  font-size: 15px;
}

.dashboard-refresh-rank-list a {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.dashboard-refresh-rank-list strong {
  color: #111827;
  font-size: 14px;
  line-height: 1.35;
}

.dashboard-refresh-rank-list p {
  margin: 0;
  color: #5d6f86;
  font-size: 12px;
  line-height: 1.5;
}

.dashboard-refresh-rank-list span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 650;
}

.dashboard-refresh-compact-empty {
  display: grid;
  gap: 6px;
  padding: 18px;
  border: 1px dashed #d6e0ec;
  border-radius: 6px;
  background: #ffffff;
}

.dashboard-refresh-compact-empty strong {
  color: #344054;
  font-size: 14px;
}

.dashboard-refresh-compact-empty small {
  color: #7c8da3;
  line-height: 1.5;
}

.dashboard-refresh-activity-list article {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e8eef6;
}

.dashboard-refresh-activity-list article:last-child {
  border-bottom: 0;
}

.dashboard-refresh-activity-list time {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 650;
}

.dashboard-refresh-activity-list div {
  display: grid;
  gap: 4px;
}

.dashboard-refresh-activity-list span {
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

.dashboard-refresh-activity-list strong {
  color: #111827;
  font-size: 14px;
  line-height: 1.45;
}

.dashboard-refresh-activity-list small {
  color: #8796aa;
}

.dashboard-refresh-secondary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-refresh-secondary-grid a {
  display: grid;
  gap: 5px;
  padding: 9px 10px;
}

.dashboard-refresh-secondary-grid strong {
  color: #111827;
  font-size: 20px;
  font-weight: 760;
}

.dashboard-refresh-boundary-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #52647a;
  font-size: 13px;
}

.dashboard-refresh-boundary-note a {
  color: #2563eb;
  font-weight: 650;
  text-decoration: none;
}

@media (max-width: 1280px) {
  .dashboard-refresh-secondary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-refresh-diagnostic-grid,
  .dashboard-refresh-lists-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-refresh-header,
  .dashboard-refresh-kpi-grid,
  .dashboard-refresh-core-grid,
  .dashboard-refresh-diagnostic-grid,
  .dashboard-refresh-secondary-grid,
  .dashboard-refresh-model-bars article > div,
  .dashboard-refresh-reason-list div,
  .dashboard-refresh-weakness-list,
  .dashboard-refresh-action-row {
    grid-template-columns: 1fr;
  }

  .dashboard-refresh-header-actions {
    justify-content: flex-start;
  }

  .dashboard-refresh-reason-list small {
    grid-column: auto;
  }
}
</style>

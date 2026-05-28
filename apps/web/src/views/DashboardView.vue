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

const authStore = useAuthStore();
const overview = ref<GeoOverviewReport | null>(null);
const suggestions = ref<OptimizationSuggestion[]>([]);
const loading = ref(false);
const overviewError = ref("");
const suggestionsError = ref("");
const lastLoadedAt = ref("");
const selectedRange = ref("近 30 天");

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

const visibilityMetrics = computed(() => [
  {
    label: "品牌提及率",
    value: formatPercent(report.value.brandMentionRate),
    description: `${formatNumber(report.value.brandMentionedCount)} 条记录提及品牌`,
    percent: getPercentValue(report.value.brandMentionRate),
    to: "/geo-reports",
    tone: "good" as DashboardTone
  },
  {
    label: "品牌推荐率",
    value: formatPercent(report.value.brandRecommendRate),
    description: `${formatNumber(report.value.brandRecommendedCount)} 条记录推荐品牌`,
    percent: getPercentValue(report.value.brandRecommendRate),
    to: "/geo-reports",
    tone: report.value.brandRecommendRate > 0 ? ("good" as DashboardTone) : ("warning" as DashboardTone)
  },
  {
    label: "官网引用率",
    value: formatPercent(report.value.citedOfficialSiteRate),
    description: `${formatNumber(report.value.citedOfficialSiteCount)} 条记录引用官网`,
    percent: getPercentValue(report.value.citedOfficialSiteRate),
    to: "/model-inclusion-records",
    tone: "default" as DashboardTone
  },
  {
    label: "未覆盖问题",
    value: formatNumber(report.value.uncoveredTrackedPromptCount),
    description: `${formatNumber(report.value.trackedPromptCount)} 个追踪词中的待补项`,
    percent: report.value.trackedPromptCount
      ? (report.value.uncoveredTrackedPromptCount / report.value.trackedPromptCount) * 100
      : 0,
    to: "/model-inclusion-records",
    tone: getCountTone(report.value.uncoveredTrackedPromptCount)
  }
]);

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

const todayTasks = computed<DashboardTask[]>(() => [
  {
    title: "待补检测词",
    count: formatNumber(report.value.uncoveredTrackedPromptCount),
    description: "优先补高优先级追踪词的模型覆盖记录。",
    status: report.value.uncoveredTrackedPromptCount > 0 ? "需处理" : "相对完整",
    to: "/model-inclusion-records",
    tone: getCountTone(report.value.uncoveredTrackedPromptCount),
    icon: TrendCharts
  },
  {
    title: "待审核资料",
    count: "暂无数据",
    description: "待接入资料审核统计。",
    status: "当前总览接口未提供",
    to: "/knowledge-bases",
    tone: "muted",
    icon: Files
  },
  {
    title: "待优化内容",
    count: formatNumber(report.value.failedContentTaskCount),
    description: "失败或需复盘的内容任务应先处理。",
    status: report.value.failedContentTaskCount > 0 ? "需处理" : "暂无失败",
    to: "/geo-content",
    tone: report.value.failedContentTaskCount > 0 ? "danger" : "default",
    icon: EditPen
  },
  {
    title: "售后反馈",
    count: "暂无数据",
    description: "待接入售后反馈统计。",
    status: "当前总览接口未提供",
    to: "/aftersales-qa",
    tone: "muted",
    icon: ChatDotRound
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

const modelCoverageDistribution = [
  { label: "豆包", value: 34, color: "#2563eb" },
  { label: "通义", value: 26, color: "#0891b2" },
  { label: "Kimi", value: 21, color: "#0d9488" },
  { label: "DeepSeek", value: 12, color: "#059669" },
  { label: "其他", value: 7, color: "#94a3b8" }
];

const contentStatusDistribution = [
  { label: "可复制", value: 42, color: "#2563eb" },
  { label: "需人工检查", value: 26, color: "#d97706" },
  { label: "生成中", value: 18, color: "#0891b2" },
  { label: "待处理", value: 14, color: "#64748b" }
];
</script>

<template>
  <section class="dashboard-refresh-page">
    <header class="dashboard-refresh-header">
      <div>
        <p>工作台</p>
        <h1>查看品牌表现、待处理任务与内容运营进度</h1>
        <span>{{ dashboardScopeText }}</span>
      </div>
      <div class="dashboard-refresh-header-actions">
        <el-segmented v-model="selectedRange" :options="['近 7 天', '近 30 天']" />
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
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <p>{{ metric.description }}</p>
          <div class="dashboard-refresh-kpi-progress" aria-hidden="true">
            <i :style="{ width: `${metric.percent}%` }" />
          </div>
          <small>来自 GEO 总览接口</small>
        </template>
      </RouterLink>
    </section>

    <section class="dashboard-refresh-overview-grid">
      <article class="dashboard-refresh-panel dashboard-refresh-trend-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>品牌表现趋势</h2>
            <p>示例趋势，仅展示趋势图样式；当前值来自总览接口。</p>
          </div>
          <el-tag effect="plain" type="info">示例趋势</el-tag>
        </div>
        <svg viewBox="0 0 720 260" role="img" aria-label="品牌提及率、推荐率和官网引用率示例趋势图">
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
        </div>
      </article>

      <article class="dashboard-refresh-panel dashboard-refresh-task-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>今日待处理</h2>
            <p>优先处理会影响 GEO 闭环的事项。</p>
          </div>
        </div>
        <div class="dashboard-refresh-task-list">
          <RouterLink
            v-for="task in todayTasks"
            :key="task.title"
            :to="task.to"
            :class="['dashboard-refresh-task-item', `dashboard-refresh-card--${task.tone}`]"
          >
            <el-icon>
              <component :is="task.icon" />
            </el-icon>
            <span>
              <strong>{{ task.title }}</strong>
              <small>{{ task.description }}</small>
            </span>
            <em>{{ task.count }}</em>
            <b>{{ task.status }}</b>
          </RouterLink>
        </div>
      </article>
    </section>

    <section class="dashboard-refresh-distribution-grid">
      <article class="dashboard-refresh-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>模型覆盖占比</h2>
            <p>示例分布，不代表真实模型占比。</p>
          </div>
          <el-tag effect="plain" type="info">示例分布</el-tag>
        </div>
        <div class="dashboard-refresh-donut-row">
          <div class="dashboard-refresh-donut dashboard-refresh-donut--model" aria-hidden="true">
            <span>4 个</span>
            <small>模型</small>
          </div>
          <ul class="dashboard-refresh-distribution-list">
            <li v-for="item in modelCoverageDistribution" :key="item.label">
              <span :style="{ background: item.color }" />
              <strong>{{ item.label }}</strong>
              <em>{{ item.value }}%</em>
            </li>
          </ul>
        </div>
      </article>

      <article class="dashboard-refresh-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>内容状态分布</h2>
            <p>示例分布，用于表达内容运营状态。</p>
          </div>
          <el-tag effect="plain" type="info">示例分布</el-tag>
        </div>
        <div class="dashboard-refresh-bar-list">
          <div v-for="item in contentStatusDistribution" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}%</strong>
            <i>
              <b :style="{ width: `${item.value}%`, background: item.color }" />
            </i>
          </div>
        </div>
      </article>
    </section>

    <section class="dashboard-refresh-lists-grid">
      <article class="dashboard-refresh-panel">
        <div class="dashboard-refresh-panel-header">
          <div>
            <h2>未覆盖问题 TOP 5</h2>
            <p>优先使用待优化建议接口；无数据时显示空状态。</p>
          </div>
        </div>
        <AppErrorState v-if="suggestionsError" title="待优化建议加载失败" :message="suggestionsError" />
        <div v-else-if="uncoveredProblemItems.length" class="dashboard-refresh-rank-list">
          <RouterLink v-for="item in uncoveredProblemItems" :key="item.title" :to="item.to">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
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
            <p>只展示接口返回的知识库缺口，不用示例数据冒充真实排行。</p>
          </div>
        </div>
        <div v-if="knowledgeGapItems.length" class="dashboard-refresh-rank-list">
          <RouterLink v-for="item in knowledgeGapItems" :key="item.title" :to="item.to">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
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
            <p>基于当前总览数据生成的运营摘要，不是审计日志。</p>
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

    <DashboardSection
      class="dashboard-refresh-section"
      title="第二层统计"
      description="保留原有资产规模指标，但下沉为辅助信息。"
    >
      <div class="dashboard-refresh-secondary-grid">
        <RouterLink v-for="metric in secondaryMetrics" :key="metric.label" :to="metric.to">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <p>{{ metric.description }}</p>
        </RouterLink>
      </div>
    </DashboardSection>

    <DashboardSection
      class="dashboard-refresh-section"
      title="快捷入口"
      description="常用动作保留在页面后半部分，避免抢占首屏。"
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
  gap: 18px;
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
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid #dfe7f1;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 5%);
}

.dashboard-refresh-header p,
.dashboard-refresh-panel-header p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.dashboard-refresh-header h1 {
  margin: 6px 0 0;
  color: #111827;
  font-size: clamp(21px, 2.5vw, 28px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.2;
}

.dashboard-refresh-header span {
  display: block;
  margin-top: 6px;
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

.dashboard-refresh-kpi-grid,
.dashboard-refresh-overview-grid,
.dashboard-refresh-distribution-grid,
.dashboard-refresh-lists-grid,
.dashboard-refresh-secondary-grid {
  display: grid;
  gap: 14px;
}

.dashboard-refresh-kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-refresh-kpi-card,
.dashboard-refresh-panel,
.dashboard-refresh-secondary-grid a {
  border: 1px solid #dfe7f1;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.dashboard-refresh-kpi-card,
.dashboard-refresh-task-item,
.dashboard-refresh-rank-list a,
.dashboard-refresh-secondary-grid a {
  color: inherit;
  text-decoration: none;
}

.dashboard-refresh-kpi-card {
  display: grid;
  gap: 8px;
  min-height: 174px;
  padding: 18px;
}

.dashboard-refresh-kpi-card span,
.dashboard-refresh-secondary-grid span {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.dashboard-refresh-kpi-card strong {
  color: #111827;
  font-size: 34px;
  font-weight: 950;
  line-height: 1;
}

.dashboard-refresh-kpi-card p,
.dashboard-refresh-secondary-grid p {
  margin: 0;
  color: #5d6f86;
  font-size: 13px;
  line-height: 1.45;
}

.dashboard-refresh-kpi-card small {
  color: #8796aa;
  font-size: 12px;
}

.dashboard-refresh-kpi-progress {
  overflow: hidden;
  height: 7px;
  border-radius: 999px;
  background: #edf2f7;
}

.dashboard-refresh-kpi-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.dashboard-refresh-card--good .dashboard-refresh-kpi-progress i {
  background: #059669;
}

.dashboard-refresh-card--warning .dashboard-refresh-kpi-progress i {
  background: #d97706;
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

.dashboard-refresh-overview-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
}

.dashboard-refresh-distribution-grid,
.dashboard-refresh-lists-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-refresh-lists-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
}

.dashboard-refresh-panel {
  min-width: 0;
  padding: 18px;
}

.dashboard-refresh-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.dashboard-refresh-panel-header h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.dashboard-refresh-trend-panel svg {
  display: block;
  width: 100%;
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
  stroke-width: 7;
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

.dashboard-refresh-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
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

.dashboard-refresh-task-list {
  display: grid;
  gap: 10px;
}

.dashboard-refresh-task-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 13px;
  border: 1px solid #e3eaf4;
  border-radius: 14px;
  background: #ffffff;
}

.dashboard-refresh-task-item .el-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: #eef4ff;
  color: #2563eb;
  font-size: 18px;
}

.dashboard-refresh-task-item span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.dashboard-refresh-task-item strong {
  color: #111827;
  font-size: 14px;
}

.dashboard-refresh-task-item small {
  overflow: hidden;
  color: #65758a;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-refresh-task-item em {
  color: #111827;
  font-size: 25px;
  font-style: normal;
  font-weight: 950;
}

.dashboard-refresh-card--muted.dashboard-refresh-task-item .el-icon {
  background: #f3f6fa;
  color: #64748b;
}

.dashboard-refresh-card--muted.dashboard-refresh-task-item em {
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
}

.dashboard-refresh-task-item b {
  grid-column: 2 / -1;
  width: fit-content;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #52647a;
  font-size: 12px;
}

.dashboard-refresh-donut-row {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.dashboard-refresh-donut {
  display: grid;
  width: 154px;
  height: 154px;
  place-items: center;
  border-radius: 50%;
}

.dashboard-refresh-donut--model {
  background:
    radial-gradient(circle, #ffffff 0 47%, transparent 48%),
    conic-gradient(#2563eb 0 34%, #0891b2 34% 60%, #0d9488 60% 81%, #059669 81% 93%, #94a3b8 93% 100%);
}

.dashboard-refresh-donut span,
.dashboard-refresh-donut small {
  grid-area: 1 / 1;
}

.dashboard-refresh-donut span {
  margin-top: -12px;
  color: #111827;
  font-size: 25px;
  font-weight: 950;
}

.dashboard-refresh-donut small {
  margin-top: 32px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.dashboard-refresh-distribution-list,
.dashboard-refresh-bar-list,
.dashboard-refresh-activity-list,
.dashboard-refresh-rank-list {
  display: grid;
  gap: 10px;
}

.dashboard-refresh-distribution-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-refresh-distribution-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  color: #52647a;
  font-size: 13px;
}

.dashboard-refresh-distribution-list li span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dashboard-refresh-distribution-list em,
.dashboard-refresh-bar-list strong {
  color: #111827;
  font-style: normal;
  font-weight: 850;
}

.dashboard-refresh-bar-list div {
  display: grid;
  grid-template-columns: 92px auto;
  gap: 8px 12px;
  align-items: center;
}

.dashboard-refresh-bar-list span {
  color: #52647a;
  font-size: 13px;
  font-weight: 750;
}

.dashboard-refresh-bar-list i {
  grid-column: 1 / -1;
  overflow: hidden;
  height: 9px;
  border-radius: 999px;
  background: #edf2f7;
}

.dashboard-refresh-bar-list b {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.dashboard-refresh-rank-list a {
  display: grid;
  gap: 6px;
  padding: 13px;
  border: 1px solid #e3eaf4;
  border-radius: 14px;
  background: #fbfdff;
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
  font-weight: 800;
}

.dashboard-refresh-compact-empty {
  display: grid;
  gap: 6px;
  padding: 18px;
  border: 1px dashed #d6e0ec;
  border-radius: 14px;
  background: #fbfdff;
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
  font-weight: 850;
}

.dashboard-refresh-activity-list div {
  display: grid;
  gap: 4px;
}

.dashboard-refresh-activity-list span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
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
  gap: 7px;
  padding: 16px;
}

.dashboard-refresh-secondary-grid strong {
  color: #111827;
  font-size: 24px;
  font-weight: 950;
}

.dashboard-refresh-boundary-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #dfe7f1;
  border-radius: 14px;
  background: #ffffff;
  color: #52647a;
  font-size: 13px;
}

.dashboard-refresh-boundary-note a {
  color: #2563eb;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 1280px) {
  .dashboard-refresh-kpi-grid,
  .dashboard-refresh-secondary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-refresh-overview-grid,
  .dashboard-refresh-distribution-grid,
  .dashboard-refresh-lists-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-refresh-header,
  .dashboard-refresh-kpi-grid,
  .dashboard-refresh-secondary-grid,
  .dashboard-refresh-donut-row {
    grid-template-columns: 1fr;
  }

  .dashboard-refresh-header-actions {
    justify-content: flex-start;
  }

  .dashboard-refresh-task-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .dashboard-refresh-task-item em {
    grid-column: 2;
  }

  .dashboard-refresh-donut {
    margin: 0 auto;
  }
}
</style>

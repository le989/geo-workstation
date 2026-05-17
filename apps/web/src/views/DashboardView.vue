<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from "vue";
import {
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
import OptimizationSuggestionList from "@/components/OptimizationSuggestionList.vue";
import QuickActionGrid from "@/components/QuickActionGrid.vue";
import { useAuthStore } from "@/stores/auth";
import { normalizeRole } from "@/utils/permission";

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

const coreMetrics = computed(() => [
  {
    label: "GEO 提示词",
    value: formatNumber(report.value.promptTotal),
    description: `${report.value.trackedPromptCount} 追踪 / ${report.value.highPriorityPromptCount} 高优先级`,
    to: "/geo-prompts",
    buttonLabel: "管理提示词",
    tone: "default" as const
  },
  {
    label: "知识库",
    value: formatNumber(report.value.knowledgeBaseCount),
    description: `${report.value.knowledgeChunkCount} 条片段`,
    to: "/knowledge-bases",
    buttonLabel: "去补资料",
    tone: report.value.knowledgeChunkCount > 0 ? ("good" as const) : ("warning" as const)
  },
  {
    label: "GEO 内容生成",
    value: `${formatNumber(report.value.contentTaskCount)} / ${formatNumber(report.value.contentItemCount)}`,
    description:
      report.value.failedContentTaskCount > 0
        ? `${report.value.failedContentTaskCount} 个失败任务待处理`
        : "暂无失败任务",
    to: "/geo-content",
    buttonLabel: "进入 GEO 内容生成",
    tone: report.value.failedContentTaskCount > 0 ? ("danger" as const) : ("good" as const)
  },
  {
    label: "GEO 检测记录",
    value: formatNumber(report.value.modelInclusionRecordCount),
    description: `提及率 ${formatPercent(report.value.brandMentionRate)} / 推荐率 ${formatPercent(
      report.value.brandRecommendRate
    )}`,
    to: "/model-inclusion-records",
    buttonLabel: "补检测记录",
    tone: report.value.uncoveredTrackedPromptCount > 0 ? ("warning" as const) : ("default" as const)
  }
]);

type DashboardAction = {
  title: string;
  description: string;
  signal: string;
  buttonLabel: string;
  to: string;
  tone: "default" | "good" | "warning" | "danger";
  icon: Component;
};

const todayActions = computed<DashboardAction[]>(() => [
  {
    title: "补 GEO 检测",
    description: "补齐追踪词检测记录。",
    signal:
      report.value.uncoveredTrackedPromptCount > 0
        ? `${report.value.uncoveredTrackedPromptCount} 个追踪词待补检测`
        : "追踪词覆盖记录相对完整",
    buttonLabel: "去补检测",
    to: "/model-inclusion-records",
    tone: getCountTone(report.value.uncoveredTrackedPromptCount),
    icon: TrendCharts
  },
  {
    title: "补内容",
    description: "围绕未命中词生成素材。",
    signal: `${report.value.contentTaskCount} 个任务 / ${report.value.contentItemCount} 篇内容`,
    buttonLabel: "去生成内容",
    to: "/geo-content",
    tone: report.value.failedContentTaskCount > 0 ? "danger" : "default",
    icon: EditPen
  },
  {
    title: "补知识库",
    description: "补企业事实和选型边界。",
    signal:
      report.value.knowledgeChunkCount > 0
        ? `${report.value.knowledgeChunkCount} 条知识片段`
        : "知识片段偏少，建议先补资料",
    buttonLabel: "去补知识库",
    to: "/knowledge-bases",
    tone: report.value.knowledgeChunkCount > 0 ? "good" : "warning",
    icon: Files
  }
]);

const operationQueue = computed(() => [
  {
    title: "待补检测 GEO 词",
    description: "优先补高优先级追踪词。",
    status:
      report.value.uncoveredTrackedPromptCount > 0
        ? `${report.value.uncoveredTrackedPromptCount} 个追踪词待处理`
        : "暂无明显检测缺口",
    to: "/model-inclusion-records",
    buttonLabel: "查看检测记录",
    tone: getCountTone(report.value.uncoveredTrackedPromptCount)
  },
  {
    title: "待质检 / 优化内容",
    description: "先质检，再做发布优化。",
    status:
      report.value.failedContentTaskCount > 0
        ? `${report.value.failedContentTaskCount} 个失败任务需处理`
        : `${report.value.contentItemCount} 篇内容可复盘`,
    to: "/geo-content",
    buttonLabel: "查看 GEO 内容生成",
    tone: report.value.failedContentTaskCount > 0 ? ("danger" as const) : ("default" as const)
  },
  {
    title: "待补知识资料",
    description: "补事实、FAQ 和选型边界。",
    status: `${report.value.knowledgeBaseCount} 个知识库 / ${report.value.knowledgeChunkCount} 条片段`,
    to: "/knowledge-bases",
    buttonLabel: "查看知识库",
    tone: report.value.knowledgeChunkCount > 0 ? ("default" as const) : ("warning" as const)
  },
  {
    title: "待看命中汇总",
    description: "看未命中、竞品占位和推荐不足。",
    status: `品牌推荐率 ${formatPercent(report.value.brandRecommendRate)}`,
    to: "/geo-reports",
    buttonLabel: "打开 GEO 报表",
    tone: report.value.brandRecommendRate > 0 ? ("good" as const) : ("warning" as const)
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

  return item.suggestedAction || "去 GEO 内容生成处理";
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
</script>

<template>
  <section class="dashboard-page">
    <header class="dashboard-hero">
      <div class="dashboard-hero__copy">
        <el-tag class="dashboard-hero__tag" effect="plain">工作台</el-tag>
        <h1>工作台</h1>
        <strong>今日运营动作与待处理事项</strong>
        <p>首页优先显示今天该处理的运营动作：补检测、补内容、补知识库，再查看命中结果。</p>
        <div class="dashboard-hero__signals" aria-label="工作台优先事项">
          <span>补检测</span>
          <span>补内容</span>
          <span>补知识库</span>
        </div>
      </div>
      <div class="dashboard-hero__actions">
        <el-tag class="dashboard-scope-tag" effect="plain">{{ dashboardScopeText }}</el-tag>
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadDashboard">
          手动刷新
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="hasOverviewError" title="GEO 总览加载失败" :message="overviewError" />

    <DashboardSection
      title="今日三件事"
      description="先处理最能推动 GEO 闭环的动作。"
    >
      <div class="dashboard-action-grid">
        <RouterLink
          v-for="action in todayActions"
          :key="action.title"
          :to="action.to"
          :class="['dashboard-action-card', `dashboard-action-card--${action.tone}`]"
        >
          <div class="dashboard-action-card__icon">
            <el-icon>
              <component :is="action.icon" />
            </el-icon>
          </div>
          <span>{{ action.title }}</span>
          <strong>{{ action.signal }}</strong>
          <p>{{ action.description }}</p>
          <small class="dashboard-action-card__button">{{ action.buttonLabel }}</small>
        </RouterLink>
      </div>
    </DashboardSection>

    <DashboardSection
      title="核心数据概况"
      description="只看 4 个关键数字。"
    >
      <div class="dashboard-core-metric-grid">
        <RouterLink
          v-for="metric in coreMetrics"
          :key="metric.label"
          :to="metric.to"
          :class="['dashboard-core-metric', `dashboard-core-metric--${metric.tone}`]"
        >
          <el-skeleton v-if="isInitialLoading" animated :rows="2" />
          <template v-else>
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <p>{{ metric.description }}</p>
            <small>{{ metric.buttonLabel }}</small>
          </template>
        </RouterLink>
      </div>
    </DashboardSection>

    <DashboardSection
      title="待处理运营队列"
      description="含合并后的待优化建议。"
    >
      <div class="dashboard-operations-grid">
        <div class="dashboard-queue-grid">
          <article
            v-for="queue in operationQueue"
            :key="queue.title"
            :class="['dashboard-queue-card', `dashboard-queue-card--${queue.tone}`]"
          >
            <div>
              <span>{{ queue.title }}</span>
              <strong>{{ queue.status }}</strong>
              <p>{{ queue.description }}</p>
            </div>
            <RouterLink :to="queue.to" class="dashboard-queue-card__link">
              {{ queue.buttonLabel }}
            </RouterLink>
          </article>
        </div>
        <div class="dashboard-suggestion-panel">
          <div class="dashboard-suggestion-panel__header">
            <strong>最近待优化建议</strong>
            <span>按类型和产品线合并，展示 5 条以内</span>
          </div>
          <OptimizationSuggestionList
            :items="groupedSuggestionPreview"
            :loading="loading && suggestions.length === 0"
            :error-message="suggestionsError"
          />
        </div>
      </div>
    </DashboardSection>

    <DashboardSection title="快捷入口" description="常用运营页面。">
      <QuickActionGrid />
      <section class="dashboard-priority-strip">
        <div>
          <span>今天优先处理</span>
          <strong>补检测、补内容、补知识库。</strong>
        </div>
        <dl>
          <div>
            <dt>未检测追踪词</dt>
            <dd>{{ formatNumber(report.uncoveredTrackedPromptCount) }}</dd>
          </div>
          <div>
            <dt>失败内容任务</dt>
            <dd>{{ formatNumber(report.failedContentTaskCount) }}</dd>
          </div>
          <div>
            <dt>知识片段</dt>
            <dd>{{ formatNumber(report.knowledgeChunkCount) }}</dd>
          </div>
        </dl>
        <RouterLink to="/geo-content">进入内容生成</RouterLink>
      </section>
      <div class="dashboard-boundary-note">
        <span>当前为内部使用版本，关键发布和参数事实仍需人工确认。</span>
        <RouterLink to="/help">查看使用教程</RouterLink>
      </div>
    </DashboardSection>
  </section>
</template>

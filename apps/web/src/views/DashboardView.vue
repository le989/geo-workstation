<script setup lang="ts">
import { computed, onMounted, ref, type Component } from "vue";
import {
  EditPen,
  Files,
  PieChart,
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
import CapabilityBoundaryCard from "@/components/CapabilityBoundaryCard.vue";
import DashboardSection from "@/components/DashboardSection.vue";
import MetricCard from "@/components/MetricCard.vue";
import OptimizationSuggestionList from "@/components/OptimizationSuggestionList.vue";
import QuickActionGrid from "@/components/QuickActionGrid.vue";

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

const formatNumber = (value: number | undefined | null) => `${value ?? 0}`;

const formatPercent = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
};

const toProgressPercent = (value: number | undefined | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  return value * 100;
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

const coreMetrics = computed(() => [
  {
    label: "GEO 提示词",
    value: formatNumber(report.value.promptTotal),
    description: `${report.value.trackedPromptCount} 个追踪词 / ${report.value.highPriorityPromptCount} 个高优先级词`,
    to: "/geo-prompts",
    buttonLabel: "管理提示词",
    tone: "default" as const
  },
  {
    label: "知识库",
    value: formatNumber(report.value.knowledgeBaseCount),
    description: `${report.value.knowledgeChunkCount} 条知识片段可供内容引用`,
    to: "/knowledge-bases",
    buttonLabel: "去补资料",
    tone: report.value.knowledgeChunkCount > 0 ? ("good" as const) : ("warning" as const)
  },
  {
    label: "内容任务 / 内容",
    value: `${formatNumber(report.value.contentTaskCount)} / ${formatNumber(report.value.contentItemCount)}`,
    description:
      report.value.failedContentTaskCount > 0
        ? `${report.value.failedContentTaskCount} 个失败任务待处理`
        : "内容生成链路当前无失败任务",
    to: "/content-tasks",
    buttonLabel: "去看内容",
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

const promptMetrics = computed(() => [
  {
    label: "提示词总量",
    value: formatNumber(report.value.promptTotal),
    description: "全部 GEO 提示词资产"
  },
  {
    label: "训练词数量",
    value: formatNumber(report.value.basePromptCount),
    description: "GEO 诊断和拓词的基础词"
  },
  {
    label: "蒸馏词数量",
    value: formatNumber(report.value.distilledPromptCount),
    description: "用户会向 AI 提问的选择型问法"
  },
  {
    label: "品牌词数量",
    value: formatNumber(report.value.brandPromptCount),
    description: "品牌验证和品牌推荐相关问法"
  },
  {
    label: "场景词数量",
    value: formatNumber(report.value.scenePromptCount),
    description: "应用场景驱动的 GEO 问法"
  },
  {
    label: "追踪提示词数量",
    value: formatNumber(report.value.trackedPromptCount),
    description: "需要持续记录模型表现的提示词"
  },
  {
    label: "高优先级提示词数量",
    value: formatNumber(report.value.highPriorityPromptCount),
    description: "优先补检测、资料和内容的提示词",
    tone: "warning" as const
  }
]);

const assetMetrics = computed(() => [
  {
    label: "知识库数量",
    value: formatNumber(report.value.knowledgeBaseCount),
    description: "企业 GEO 知识资产集合"
  },
  {
    label: "知识片段数量",
    value: formatNumber(report.value.knowledgeChunkCount),
    description: "可被内容生成引用的事实片段"
  },
  {
    label: "内容任务数量",
    value: formatNumber(report.value.contentTaskCount),
    description: "围绕提示词创建的 GEO 内容任务"
  },
  {
    label: "内容项数量",
    value: formatNumber(report.value.contentItemCount),
    description: "已沉淀的生成内容资产"
  },
  {
    label: "失败内容任务",
    value: formatNumber(report.value.failedContentTaskCount),
    description: "需要重试或补充输入的任务",
    tone: report.value.failedContentTaskCount > 0 ? ("danger" as const) : ("default" as const)
  }
]);

const modelMetrics = computed(() => [
  {
    label: "模型覆盖记录数",
    value: formatNumber(report.value.modelInclusionRecordCount),
    description: "人工录入或导入的模型表现记录"
  },
  {
    label: "品牌提及次数",
    value: formatNumber(report.value.brandMentionedCount),
    description: "AI 回答中出现品牌的次数",
    tone: "good" as const
  },
  {
    label: "品牌推荐次数",
    value: formatNumber(report.value.brandRecommendedCount),
    description: "AI 明确推荐品牌的次数",
    tone: "good" as const
  },
  {
    label: "品牌提及率",
    value: formatPercent(report.value.brandMentionRate),
    description: "品牌在覆盖记录中被提及的比例",
    percent: toProgressPercent(report.value.brandMentionRate)
  },
  {
    label: "品牌推荐率",
    value: formatPercent(report.value.brandRecommendRate),
    description: "品牌在覆盖记录中被推荐的比例",
    percent: toProgressPercent(report.value.brandRecommendRate)
  },
  {
    label: "官网引用次数",
    value: formatNumber(report.value.citedOfficialSiteCount),
    description: "AI 回答引用官网或可信来源的次数"
  },
  {
    label: "官网引用率",
    value: formatPercent(report.value.citedOfficialSiteRate),
    description: "官网引用记录占模型记录的比例",
    percent: toProgressPercent(report.value.citedOfficialSiteRate)
  },
  {
    label: "未覆盖追踪提示词数",
    value: formatNumber(report.value.uncoveredTrackedPromptCount),
    description: "仍缺模型表现记录的追踪词",
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
    description: "先把追踪词的模型覆盖记录补齐，避免报表缺少判断依据。",
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
    description: "围绕未命中词或高优先级词补内容任务，让 AI 有可引用素材。",
    signal: `${report.value.contentTaskCount} 个任务 / ${report.value.contentItemCount} 篇内容`,
    buttonLabel: "去生成内容",
    to: "/content-tasks",
    tone: report.value.failedContentTaskCount > 0 ? "danger" : "default",
    icon: EditPen
  },
  {
    title: "补知识库",
    description: "补企业事实、选型边界和 FAQ，减少内容生成里的未经证实表达。",
    signal:
      report.value.knowledgeChunkCount > 0
        ? `${report.value.knowledgeChunkCount} 条知识片段`
        : "知识片段偏少，建议先补资料",
    buttonLabel: "去补知识库",
    to: "/knowledge-bases",
    tone: report.value.knowledgeChunkCount > 0 ? "good" : "warning",
    icon: Files
  },
  {
    title: "看命中结果",
    description: "查看平台命中、品牌提及和推荐表现，决定下一轮补什么。",
    signal: `${report.value.modelInclusionRecordCount} 条检测记录`,
    buttonLabel: "去看报表",
    to: "/reports",
    tone: report.value.modelInclusionRecordCount > 0 ? "good" : "warning",
    icon: PieChart
  }
]);

const operationQueue = computed(() => [
  {
    title: "待补检测 GEO 词",
    description: "优先处理高优先级、已开启追踪但还没有检测记录的词。",
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
    description: "内容生成后建议先做质量检查，再准备发布优化版和富文本稿。",
    status:
      report.value.failedContentTaskCount > 0
        ? `${report.value.failedContentTaskCount} 个失败任务需处理`
        : `${report.value.contentItemCount} 篇内容可复盘`,
    to: "/content-tasks",
    buttonLabel: "查看内容任务",
    tone: report.value.failedContentTaskCount > 0 ? ("danger" as const) : ("default" as const)
  },
  {
    title: "待补知识资料",
    description: "如果内容中常出现未证实参数，优先补知识库和指令模板事实边界。",
    status: `${report.value.knowledgeBaseCount} 个知识库 / ${report.value.knowledgeChunkCount} 条片段`,
    to: "/knowledge-bases",
    buttonLabel: "查看知识库",
    tone: report.value.knowledgeChunkCount > 0 ? ("default" as const) : ("warning" as const)
  },
  {
    title: "待看命中汇总",
    description: "定期看各平台最新命中结果，找出未提及、竞品占位和推荐不足的词。",
    status: `品牌推荐率 ${formatPercent(report.value.brandRecommendRate)}`,
    to: "/reports",
    buttonLabel: "打开 GEO 报表",
    tone: report.value.brandRecommendRate > 0 ? ("good" as const) : ("warning" as const)
  }
]);

const recentSuggestionPreview = computed(() => suggestions.value.slice(0, 5));
</script>

<template>
  <section class="dashboard-page">
    <header class="dashboard-hero">
      <div class="dashboard-hero__copy">
        <el-tag type="success" effect="plain">GEO 工作台</el-tag>
        <h1>今天先把 GEO 闭环往前推进一步</h1>
        <p>
          首页优先展示今天该处理的运营动作：补检测、补内容、补知识库，再查看命中结果。
          下面的数据仍来自现有 GEO 总览和优化建议接口。
        </p>
      </div>
      <div class="dashboard-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadDashboard">
          手动刷新
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="hasOverviewError" title="GEO 总览加载失败" :message="overviewError" />

    <DashboardSection
      title="今天建议先处理这几件事"
      description="把首页当作运营入口：先看动作，再进入对应页面处理，不在首页自动执行任何操作。"
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
      description="只保留首屏最需要看的 4 个指标，帮助快速判断今天该补哪里。"
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
      description="这里不新增任务，只把现有数据组织成下一步入口。"
    >
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
    </DashboardSection>

    <DashboardSection
      title="最近待优化建议"
      description="默认展示 5 条以内，优先作为今日处理线索；完整清单可进入报表继续看。"
    >
      <OptimizationSuggestionList
        :items="recentSuggestionPreview"
        :loading="loading && suggestions.length === 0"
        :error-message="suggestionsError"
      />
    </DashboardSection>

    <DashboardSection title="快捷入口" description="常用运营页面保留在这里，作为首页动作卡片的补充。">
      <QuickActionGrid />
    </DashboardSection>

    <DashboardSection
      title="更多数据概况"
      description="次要指标下移展示，保留原有统计来源，避免首屏变成指标墙。"
    >
      <el-collapse class="dashboard-secondary-collapse">
        <el-collapse-item title="提示词资产细分" name="prompts">
          <div class="metric-grid metric-grid--prompts">
            <MetricCard
              v-for="metric in promptMetrics"
              :key="metric.label"
              :label="metric.label"
              :value="metric.value"
              :description="metric.description"
              :tone="metric.tone"
              :loading="isInitialLoading"
            />
          </div>
        </el-collapse-item>
        <el-collapse-item title="知识库与内容资产" name="assets">
          <div class="metric-grid">
            <MetricCard
              v-for="metric in assetMetrics"
              :key="metric.label"
              :label="metric.label"
              :value="metric.value"
              :description="metric.description"
              :tone="metric.tone"
              :loading="isInitialLoading"
            />
          </div>
        </el-collapse-item>
        <el-collapse-item title="模型覆盖效果" name="models">
          <div class="metric-grid metric-grid--model">
            <MetricCard
              v-for="metric in modelMetrics"
              :key="metric.label"
              :label="metric.label"
              :value="metric.value"
              :description="metric.description"
              :tone="metric.tone"
              :percent="metric.percent"
              :loading="isInitialLoading"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
    </DashboardSection>

    <DashboardSection
      title="当前能力边界"
      description="明确哪些能力已经真实入库，哪些仍是模拟生成，避免把演示流程误判为自动化检测。"
    >
      <div class="dashboard-boundary-layout">
        <CapabilityBoundaryCard />
      </div>
    </DashboardSection>
  </section>
</template>

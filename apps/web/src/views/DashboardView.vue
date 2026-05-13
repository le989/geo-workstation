<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
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

const todayActions = computed(() => {
  const actions = [
    {
      title: "优先补模型覆盖记录",
      description: "高优先级追踪词如果缺少覆盖记录，报表无法判断品牌是否被提及或推荐。",
      value: formatNumber(report.value.uncoveredTrackedPromptCount),
      unit: "个未覆盖追踪词",
      to: "/model-inclusion-records",
      tone: report.value.uncoveredTrackedPromptCount > 0 ? "warning" : "default"
    },
    {
      title: "补齐可引用知识资料",
      description: "知识片段越完整，真实 AI 内容生成越不容易出现未经证实的参数和结论。",
      value: formatNumber(report.value.knowledgeChunkCount),
      unit: "条知识片段",
      to: "/knowledge-bases",
      tone: report.value.knowledgeChunkCount > 0 ? "good" : "warning"
    },
    {
      title: "处理失败内容任务",
      description: "失败任务通常来自输入不足或真实 AI 配置问题，建议及时查看失败原因。",
      value: formatNumber(report.value.failedContentTaskCount),
      unit: "个失败任务",
      to: "/content-tasks",
      tone: report.value.failedContentTaskCount > 0 ? "danger" : "default"
    }
  ];

  return actions;
});
</script>

<template>
  <section class="dashboard-page">
    <header class="dashboard-hero">
      <div class="dashboard-hero__copy">
        <el-tag type="success" effect="plain">GEO 工作台</el-tag>
        <h1>GEO 工作台</h1>
        <p>
          围绕“提示词资产、企业知识库、GEO 内容、模型覆盖记录”查看当前 GEO
          运营进度，并判断下一步应该补词、补资料、补内容还是补检测。
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

    <section class="dashboard-focus-grid">
      <article class="dashboard-focus-card dashboard-focus-card--primary">
        <p class="section-kicker">今日建议</p>
        <h2>先处理最影响 GEO 闭环的数据缺口</h2>
        <p>
          工作台会把提示词、知识库、内容和覆盖记录串起来。建议先补检测记录，再补知识资料和内容任务。
        </p>
        <div class="dashboard-focus-card__footer">
          <el-tag effect="plain" type="success">内部运营工作台</el-tag>
          <span>{{
            suggestions.length > 0
              ? `当前有 ${suggestions.length} 条待优化建议`
              : "暂无明显待优化项"
          }}</span>
        </div>
      </article>

      <RouterLink
        v-for="action in todayActions"
        :key="action.title"
        :to="action.to"
        :class="['dashboard-action-card', `dashboard-action-card--${action.tone}`]"
      >
        <span>{{ action.title }}</span>
        <strong>{{ action.value }}</strong>
        <small>{{ action.unit }}</small>
        <p>{{ action.description }}</p>
      </RouterLink>
    </section>

    <DashboardSection
      title="GEO 资产概览"
      description="先看提示词资产是否完整，再决定是否需要拓词、导入或开启追踪。"
    >
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
    </DashboardSection>

    <DashboardSection
      title="知识库与内容资产"
      description="知识库决定 AI 可引用事实，内容资产决定这些事实能否进入可发布素材。"
    >
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
    </DashboardSection>

    <DashboardSection
      title="模型覆盖效果"
      description="用覆盖记录判断品牌是否被 AI 提及、推荐和引用官网。"
    >
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
    </DashboardSection>

    <DashboardSection
      title="待优化建议"
      description="按优先级展示当前最值得处理的 GEO 缺口，最多显示 8 条。"
    >
      <OptimizationSuggestionList
        :items="suggestions"
        :loading="loading && suggestions.length === 0"
        :error-message="suggestionsError"
      />
    </DashboardSection>

    <DashboardSection title="快捷入口" description="从工作台直接跳转到下一步运营动作。">
      <QuickActionGrid />
    </DashboardSection>

    <DashboardSection
      title="当前能力边界"
      description="明确哪些能力已经真实入库，哪些仍是模拟生成，避免把演示流程误判为自动化检测。"
    >
      <CapabilityBoundaryCard />
    </DashboardSection>
  </section>
</template>

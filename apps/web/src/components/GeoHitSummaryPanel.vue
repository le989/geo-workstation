<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  GeoHitPromptMatrixItem,
  GeoHitPromptMatrixResult,
  GeoHitSummaryReport
} from "@/api/reports";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import { formatDateTime } from "@/config/geo-prompt-options";
import {
  entryPointLabelMap,
  hitLevelLabelMap,
  hitLevelTypeMap
} from "@/config/model-inclusion-options";
import { formatReportNumber, formatReportPercent, toReportPercent } from "@/config/report-options";

const props = defineProps<{
  report: GeoHitSummaryReport | null;
  loading?: boolean;
}>();

type MatrixColumn = {
  key: string;
  platform: string;
  entryPoint: string;
  label: string;
};

type MatrixFilter =
  | "all"
  | "not_mentioned"
  | "recommended"
  | "mentioned"
  | "competitor_only"
  | "unclear";

type SummaryMetric = {
  label: string;
  value: string;
  description: string;
  percent?: number;
  tone?: "default" | "good" | "warning" | "danger";
};

type SuggestionActionGroup = {
  key: "content" | "knowledge" | "retest" | "later";
  title: string;
  description: string;
  emptyText: string;
  items: GeoHitSummaryReport["optimizationSuggestions"];
};

const overallStatusLabelMap: Record<string, string> = {
  all_mentioned: "全部提及",
  all_recommended: "全部推荐",
  competitor_only: "竞品占位",
  not_mentioned: "全部未命中",
  partial_hit: "部分命中",
  unclear: "无法判断",
  unchecked: "未检测"
};

const overallStatusTypeMap: Record<string, string> = {
  all_mentioned: "primary",
  all_recommended: "success",
  competitor_only: "warning",
  not_mentioned: "danger",
  partial_hit: "warning",
  unclear: "info",
  unchecked: "info"
};

const suggestionTypeLabelMap: Record<string, string> = {
  competitor_without_brand: "竞品占位",
  kimi_gap: "Kimi 缺口",
  mentioned_not_recommended: "提及未推荐",
  not_mentioned: "高优先级未命中",
  unclear_results: "结果需复核"
};

const matrixFilter = ref<MatrixFilter>("all");
const matrixPage = ref(1);
const matrixPageSize = 20;
const noteSections = ref<string[]>([]);
const matrixSections = ref<string[]>([]);

const matrixFilterOptions: Array<{ label: string; value: MatrixFilter }> = [
  { label: "全部", value: "all" },
  { label: "只看未命中", value: "not_mentioned" },
  { label: "只看推荐命中", value: "recommended" },
  { label: "只看提及命中", value: "mentioned" },
  { label: "只看竞品占位", value: "competitor_only" },
  { label: "只看无法判断", value: "unclear" }
];

const matrixDisplayNotice = "当前仅展示前 20 条，完整数据可通过筛选查看。";
const latestRecordTotal = computed(() => props.report?.overview.latestRecordCount ?? 0);

const contentAssetCitationRate = computed(() =>
  calculateLocalRate(props.report?.overview.citedContentAssetCount ?? 0, latestRecordTotal.value)
);

const unclearRate = computed(() =>
  calculateLocalRate(props.report?.overview.unclearCount ?? 0, latestRecordTotal.value)
);

const coreMetrics = computed<SummaryMetric[]>(() => [
  {
    label: "品牌推荐率",
    value: formatReportPercent(props.report?.overview.brandRecommendRate),
    description: "最新结果中明确推荐目标品牌的比例",
    percent: toReportPercent(props.report?.overview.brandRecommendRate),
    tone: "good" as const
  },
  {
    label: "品牌提及率",
    value: formatReportPercent(props.report?.overview.brandMentionRate),
    description: "最新结果中有效提及目标品牌的比例",
    percent: toReportPercent(props.report?.overview.brandMentionRate),
    tone: "good" as const
  },
  {
    label: "未命中率",
    value: formatReportPercent(props.report?.overview.notMentionedRate),
    description: "最新结果中未提及、未推荐、未引用的比例",
    percent: toReportPercent(props.report?.overview.notMentionedRate),
    tone: "warning" as const
  },
  {
    label: "竞品占位率",
    value: formatReportPercent(props.report?.overview.competitorMentionRate),
    description: "出现竞品且目标品牌弱势或缺席的风险信号",
    percent: toReportPercent(props.report?.overview.competitorMentionRate),
    tone: "warning" as const
  }
]);

const supportingMetrics = computed<SummaryMetric[]>(() => [
  {
    label: "官网引用率",
    value: formatReportPercent(props.report?.overview.officialSiteCitationRate),
    description: "辅助指标，不作为主要 GEO 命中判断。",
    percent: toReportPercent(props.report?.overview.officialSiteCitationRate)
  },
  {
    label: "内容资产引用率",
    value: formatReportPercent(contentAssetCitationRate.value),
    description: "辅助观察已发布内容是否进入回答链路",
    percent: toReportPercent(contentAssetCitationRate.value)
  },
  {
    label: "无法判断率",
    value: formatReportPercent(unclearRate.value),
    description: "失败、空回答或证据不足的最新结果比例",
    percent: toReportPercent(unclearRate.value),
    tone: "warning" as const
  },
  {
    label: "检测提示词数",
    value: `${formatReportNumber(props.report?.overview.checkedPromptCount)} / ${formatReportNumber(
      props.report?.overview.promptCount
    )}`,
    description: "当前筛选范围内已有最新检测结果的提示词"
  },
  {
    label: "最新记录数",
    value: formatReportNumber(props.report?.overview.latestRecordCount),
    description: "按提示词 + 平台 + 入口去重后的最新检测样本"
  }
]);

const matrixColumns = computed<MatrixColumn[]>(() => {
  const columns = new Map<string, MatrixColumn>();

  for (const item of props.report?.promptMatrix ?? []) {
    for (const result of item.results) {
      const key = buildMatrixColumnKey(result.platform, result.entryPoint);
      if (!columns.has(key)) {
        columns.set(key, {
          key,
          platform: result.platform,
          entryPoint: result.entryPoint,
          label: `${result.platform} / ${formatEntryPoint(result.entryPoint)}`
        });
      }
    }
  }

  return [...columns.values()];
});

const conclusionItems = computed(() => {
  if (!props.report || props.report.overview.latestRecordCount === 0) {
    return ["暂无可解读的最新检测结果。可先补充模型覆盖记录，再回到本页复盘。"];
  }

  const items: string[] = [];
  const overview = props.report.overview;
  const topRecommendPlatform = findBestPlatform("brandRecommendRate");
  const topMentionPlatform = findBestPlatform("brandMentionRate");
  const highNotMentionPlatform = findBestPlatform("notMentionedRate");
  const priorityPrompts = props.report.optimizationSuggestions
    .filter((item) => item.type === "not_mentioned" || item.type === "competitor_without_brand")
    .slice(0, 3)
    .map((item) => item.promptText);
  const multiPlatformHitPrompts = props.report.promptMatrix
    .filter((item) => item.results.filter(isHitResult).length >= 2)
    .slice(0, 3)
    .map((item) => item.promptText);

  if (overview.notMentionedRate > 0 || overview.competitorMentionRate > 0) {
    items.push(
      `当前最需要处理：未命中率 ${formatReportPercent(
        overview.notMentionedRate
      )}，竞品占位率 ${formatReportPercent(overview.competitorMentionRate)}。`
    );
  } else {
    items.push("当前最新结果中暂未看到明显未命中或竞品占位风险。");
  }

  if (topRecommendPlatform) {
    items.push(
      `${topRecommendPlatform.platform} 的品牌推荐率最高，为 ${formatReportPercent(
        topRecommendPlatform.brandRecommendRate
      )}。`
    );
  }

  if (topMentionPlatform) {
    items.push(
      `${topMentionPlatform.platform} 的品牌提及率最高，为 ${formatReportPercent(
        topMentionPlatform.brandMentionRate
      )}。`
    );
  }

  if (highNotMentionPlatform && highNotMentionPlatform.notMentionedRate > 0) {
    items.push(
      `${highNotMentionPlatform.platform} 的未命中率相对较高，为 ${formatReportPercent(
        highNotMentionPlatform.notMentionedRate
      )}，适合优先复盘内容缺口。`
    );
  }

  if (priorityPrompts.length > 0) {
    items.push(`优先补内容的提示词：${priorityPrompts.join("、")}。`);
  }

  if (items.length < 4 && multiPlatformHitPrompts.length > 0) {
    items.push(`多平台已有命中的提示词：${multiPlatformHitPrompts.join("、")}。`);
  }

  return items.slice(0, 4);
});

const filteredPromptMatrix = computed(() =>
  (props.report?.promptMatrix ?? []).filter((item) => {
    if (matrixFilter.value === "all") {
      return true;
    }

    if (matrixFilter.value === "not_mentioned") {
      return item.overallStatus === "not_mentioned";
    }

    if (matrixFilter.value === "recommended") {
      return item.results.some(
        (result) => result.brandRecommended || result.hitLevel === "recommended"
      );
    }

    if (matrixFilter.value === "mentioned") {
      return item.results.some(
        (result) => result.brandMentioned || result.hitLevel === "mentioned"
      );
    }

    if (matrixFilter.value === "competitor_only") {
      return item.results.some(
        (result) =>
          result.hitLevel === "competitor_only" ||
          (result.competitorMentioned && !result.brandMentioned)
      );
    }

    return (
      item.overallStatus === "unclear" ||
      item.results.some((result) => result.hitLevel === "unclear")
    );
  })
);

const paginatedPromptMatrix = computed(() => {
  const start = (matrixPage.value - 1) * matrixPageSize;
  return filteredPromptMatrix.value.slice(start, start + matrixPageSize);
});

const platformCards = computed(() => {
  const bestRecommendPlatform = findBestPlatform("brandRecommendRate");
  const highNotMentionPlatform = findBestPlatform("notMentionedRate");

  return (props.report?.platformComparison ?? []).map((item) => {
    const platformName = formatPlatformName(item.platform);
    const isBestRecommend =
      bestRecommendPlatform?.platform === item.platform && item.brandRecommendRate > 0;
    const isWeakNotMention =
      highNotMentionPlatform?.platform === item.platform && item.notMentionedRate > 0;
    const hasCompetitorRisk = item.competitorMentionRate > 0;

    return {
      ...item,
      platformName,
      badge: isBestRecommend
        ? "推荐表现较好"
        : isWeakNotMention
          ? "未命中较高"
          : hasCompetitorRisk
            ? "存在竞品占位"
            : "重点观察",
      tone: isWeakNotMention || hasCompetitorRisk ? "warning" : isBestRecommend ? "good" : "default"
    };
  });
});

const suggestionActionGroups = computed<SuggestionActionGroup[]>(() => {
  const suggestions = props.report?.optimizationSuggestions ?? [];
  const groups: SuggestionActionGroup[] = [
    {
      key: "content",
      title: "优先补内容",
      description: "处理未命中、竞品占位和提及未推荐的提示词。",
      emptyText: "暂无必须优先补内容的提示词。",
      items: []
    },
    {
      key: "knowledge",
      title: "优先补知识库",
      description: "补充品牌事实、选型边界和可引用资料。",
      emptyText: "暂无明显知识库缺口建议。",
      items: []
    },
    {
      key: "retest",
      title: "优先复测",
      description: "处理无法判断、接口失败或结果不稳定的记录。",
      emptyText: "暂无需要优先复测的提示词。",
      items: []
    },
    {
      key: "later",
      title: "暂不处理",
      description: "已有多平台命中或优先级较低，可先观察。",
      emptyText: "暂无可暂缓处理的建议。",
      items: []
    }
  ];
  const groupMap = new Map(groups.map((group) => [group.key, group]));

  for (const suggestion of suggestions) {
    const groupKey = getSuggestionActionGroupKey(suggestion.type, suggestion.priority);
    groupMap.get(groupKey)?.items.push(suggestion);
  }

  return groups;
});

const formatEntryPoint = (value?: string) =>
  value ? (entryPointLabelMap[value as keyof typeof entryPointLabelMap] ?? value) : "--";

const formatHitLevel = (value?: string) =>
  value ? (hitLevelLabelMap[value as keyof typeof hitLevelLabelMap] ?? value) : "未检测";

const getHitLevelType = (value?: string) =>
  value ? (hitLevelTypeMap[value as keyof typeof hitLevelTypeMap] ?? "info") : "info";

const buildMatrixColumnKey = (platform: string, entryPoint: string) => `${platform}::${entryPoint}`;

const getMatrixResult = (row: GeoHitPromptMatrixItem, column: MatrixColumn) =>
  row.results.find(
    (result) => buildMatrixColumnKey(result.platform, result.entryPoint) === column.key
  );

const formatPlatformName = (value?: string) => value || "未标记平台";

const formatHitLevelDistribution = (distribution: Record<string, number>) =>
  Object.entries(distribution)
    .sort((left, right) => right[1] - left[1])
    .map(([key, value]) => `${formatHitLevel(key)} ${value}`)
    .join(" / ") || "--";

const formatPriority = (value: "high" | "medium" | "low") =>
  ({ high: "高", low: "低", medium: "中" })[value];

const calculateLocalRate = (count: number, total: number) => (total > 0 ? count / total : 0);

const findBestPlatform = (key: "brandMentionRate" | "brandRecommendRate" | "notMentionedRate") =>
  [...(props.report?.platformComparison ?? [])]
    .filter((item) => item.recordCount > 0)
    .sort((left, right) => right[key] - left[key])[0];

const isHitResult = (result: GeoHitPromptMatrixResult) =>
  result.brandRecommended ||
  result.brandMentioned ||
  result.citedOfficialSite ||
  ["recommended", "mentioned", "cited"].includes(result.hitLevel);

const getOverallStatusHint = (row: GeoHitPromptMatrixItem) => {
  if (row.overallStatus === "all_recommended") {
    return "多平台推荐，保持观察";
  }
  if (row.overallStatus === "all_mentioned") {
    return "已提及，争取推荐";
  }
  if (row.overallStatus === "partial_hit") {
    return "部分平台命中，补齐薄弱平台";
  }
  if (row.overallStatus === "not_mentioned") {
    return "全平台未命中，优先补内容";
  }
  if (row.overallStatus === "competitor_only") {
    return "竞品占位，优先补品牌内容";
  }
  if (row.overallStatus === "unclear") {
    return "结果不稳，建议复测";
  }
  return "暂无检测记录";
};

const getOverallStatusClass = (status: string) =>
  ["not_mentioned", "competitor_only", "partial_hit", "unclear"].includes(status)
    ? "is-risk"
    : "is-ok";

const getMatrixResultClass = (result?: GeoHitPromptMatrixResult) => {
  if (!result) {
    return "is-unchecked";
  }
  if (result.hitLevel === "not_mentioned" || result.hitLevel === "competitor_only") {
    return "is-risk";
  }
  if (result.hitLevel === "unclear") {
    return "is-unclear";
  }
  if (!result.brandRecommended && result.brandMentioned) {
    return "is-watch";
  }
  return "is-hit";
};

const getResultSignals = (result?: GeoHitPromptMatrixResult) => {
  if (!result) {
    return ["未检测"];
  }

  const signals: string[] = [];

  if (
    result.hitLevel === "competitor_only" ||
    (result.competitorMentioned && !result.brandMentioned)
  ) {
    signals.push("竞品占位");
  }
  if (result.hitLevel === "not_mentioned" || !result.brandMentioned) {
    signals.push("未提及");
  }
  if (result.brandMentioned && !result.brandRecommended) {
    signals.push("已提及", "未推荐");
  }
  if (result.brandRecommended) {
    signals.push("已推荐");
  }
  if (result.citedOfficialSite) {
    signals.push("官网引用");
  }
  if (result.hitLevel === "unclear") {
    signals.push("需复测");
  }

  return [...new Set(signals)].slice(0, 3);
};

const getSuggestionActionGroupKey = (
  type: string,
  priority: "high" | "medium" | "low"
): SuggestionActionGroup["key"] => {
  if (type === "unclear_results") {
    return "retest";
  }
  if (type === "mentioned_not_recommended") {
    return "knowledge";
  }
  if (type === "not_mentioned" || type === "competitor_without_brand" || type === "kimi_gap") {
    return "content";
  }
  return priority === "low" ? "later" : "knowledge";
};

watch(matrixFilter, () => {
  matrixPage.value = 1;
});

watch(
  () => props.report?.promptMatrix,
  () => {
    matrixPage.value = 1;
  }
);
</script>

<template>
  <section class="report-panel geo-hit-summary-panel">
    <el-collapse v-model="noteSections" class="geo-hit-summary-panel__diagnostic">
      <el-collapse-item name="scope" title="统计口径与排查信息">
        <div class="geo-hit-summary-panel__notice">
          <p>本汇总默认按每个提示词 + 平台 + 入口的最新检测结果统计，避免重复记录影响判断。</p>
          <p>官网引用率是辅助指标，不作为主要 GEO 命中判断。核心指标是品牌推荐率和品牌提及率。</p>
          <p>如当前范围内数据较少，可先补充模型覆盖记录或缩小筛选条件后再复盘。</p>
        </div>
      </el-collapse-item>
    </el-collapse>

    <el-card class="geo-hit-summary-panel__insight" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>本轮结论 / 自动解读</h3>
            <span>基于当前筛选范围内的最新模型覆盖结果进行展示层解读。</span>
          </div>
        </div>
      </template>
      <ul class="geo-hit-summary-panel__insight-list">
        <li v-for="item in conclusionItems" :key="item">{{ item }}</li>
      </ul>
    </el-card>

    <section class="geo-hit-summary-panel__metric-section">
      <div>
        <p class="geo-hit-summary-panel__section-kicker">核心指标</p>
        <h3>先看推荐、提及、未命中和竞品占位</h3>
      </div>
      <div class="geo-hit-summary-panel__metric-layout">
        <div class="geo-hit-summary-panel__core-metrics">
          <ReportMetricCard
            v-for="metric in coreMetrics"
            :key="metric.label"
            :description="metric.description"
            :label="metric.label"
            :loading="loading"
            :percent="metric.percent"
            :tone="metric.tone"
            :value="metric.value"
          />
        </div>
        <aside class="geo-hit-summary-panel__supporting-metrics">
          <div class="geo-hit-summary-panel__supporting-header">
            <span>辅助观察</span>
            <strong>官网引用率不作为主要 GEO 命中判断</strong>
          </div>
          <article v-for="metric in supportingMetrics" :key="metric.label">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <p>{{ metric.description }}</p>
          </article>
        </aside>
      </div>
    </section>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>平台对比</h3>
            <span>Kimi、豆包 / 火山方舟、通义千问 / 阿里云百炼等联网入口的最新结果对比。</span>
          </div>
        </div>
      </template>
      <div class="geo-hit-summary-panel__platform-grid">
        <article
          v-for="platform in platformCards"
          :key="platform.platformName"
          :class="['geo-hit-summary-panel__platform-card', `is-${platform.tone}`]"
        >
          <div class="geo-hit-summary-panel__platform-head">
            <div>
              <span>{{ platform.badge }}</span>
              <strong>{{ platform.platformName }}</strong>
            </div>
            <em>{{ formatReportNumber(platform.recordCount) }} 条</em>
          </div>
          <dl>
            <div>
              <dt>推荐</dt>
              <dd>{{ formatReportPercent(platform.brandRecommendRate) }}</dd>
            </div>
            <div>
              <dt>提及</dt>
              <dd>{{ formatReportPercent(platform.brandMentionRate) }}</dd>
            </div>
            <div>
              <dt>未命中</dt>
              <dd>{{ formatReportPercent(platform.notMentionedRate) }}</dd>
            </div>
            <div>
              <dt>竞品</dt>
              <dd>{{ formatReportPercent(platform.competitorMentionRate) }}</dd>
            </div>
          </dl>
          <p>命中等级：{{ formatHitLevelDistribution(platform.hitLevelDistribution) }}</p>
        </article>
      </div>
      <el-table
        v-loading="loading"
        :data="report?.platformComparison ?? []"
        border
        class="geo-hit-summary-panel__detail-table"
        empty-text="暂无平台汇总"
      >
        <el-table-column label="平台" min-width="180" prop="platform" fixed />
        <el-table-column label="记录数" width="90" prop="recordCount" />
        <el-table-column label="提及率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.brandMentionRate) }}</template>
        </el-table-column>
        <el-table-column label="推荐率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.brandRecommendRate) }}</template>
        </el-table-column>
        <el-table-column label="未命中率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.notMentionedRate) }}</template>
        </el-table-column>
        <el-table-column label="竞品率" width="110">
          <template #default="{ row }">
            {{ formatReportPercent(row.competitorMentionRate) }}
          </template>
        </el-table-column>
        <el-table-column label="命中等级分布" min-width="220">
          <template #default="{ row }">
            {{ formatHitLevelDistribution(row.hitLevelDistribution) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>入口对比</h3>
            <span>按 API、联网搜索、网页端和 App 抽查等检测入口拆分最新结果。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.entryPointComparison ?? []"
        border
        class="geo-hit-summary-panel__detail-table"
        empty-text="暂无入口汇总"
      >
        <el-table-column label="入口" min-width="180">
          <template #default="{ row }">{{ formatEntryPoint(row.entryPoint) }}</template>
        </el-table-column>
        <el-table-column label="记录数" width="90" prop="recordCount" />
        <el-table-column label="提及率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.brandMentionRate) }}</template>
        </el-table-column>
        <el-table-column label="推荐率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.brandRecommendRate) }}</template>
        </el-table-column>
        <el-table-column label="未命中率" width="110">
          <template #default="{ row }">{{ formatReportPercent(row.notMentionedRate) }}</template>
        </el-table-column>
        <el-table-column label="竞品率" width="110">
          <template #default="{ row }">
            {{ formatReportPercent(row.competitorMentionRate) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-collapse v-model="matrixSections" class="report-secondary-collapse">
      <el-collapse-item name="matrix" title="查看完整提示词矩阵">
        <el-card class="report-table-card" shadow="never">
          <template #header>
            <div class="report-card-header">
              <div>
                <h3>提示词矩阵</h3>
                <span>
                  每行一个 GEO 提示词，每列展示一个平台入口的最新命中状态。
                  {{ matrixDisplayNotice }}
                </span>
              </div>
            </div>
          </template>
          <div class="geo-hit-summary-panel__matrix-guide">
            <strong>优先扫描：</strong>
            <span>未命中、竞品占位、未推荐、未提及。已推荐和已提及会弱化展示，避免矩阵过度拥挤。</span>
          </div>
          <div class="geo-hit-summary-panel__matrix-toolbar">
            <el-radio-group v-model="matrixFilter" size="small">
              <el-radio-button
                v-for="option in matrixFilterOptions"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
            <span>
              当前筛选 {{ filteredPromptMatrix.length }} 条，分页每页 {{ matrixPageSize }} 条。
            </span>
          </div>
          <el-table
            v-loading="loading"
            :data="paginatedPromptMatrix"
            border
            class="geo-hit-summary-panel__matrix-table"
            empty-text="暂无提示词矩阵"
          >
            <el-table-column label="提示词" min-width="300" fixed>
              <template #default="{ row }">
                <div class="geo-hit-summary-panel__prompt-cell">
                  <strong>{{ row.promptText }}</strong>
                  <span :class="getOverallStatusClass(row.overallStatus)">
                    {{ getOverallStatusHint(row) }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="产品线" width="150" prop="productLine" />
            <el-table-column label="优先级" width="90" prop="priority" />
            <el-table-column label="整体状态" width="120">
              <template #default="{ row }">
                <el-tag :type="overallStatusTypeMap[row.overallStatus]">
                  {{ overallStatusLabelMap[row.overallStatus] ?? row.overallStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              v-for="column in matrixColumns"
              :key="column.key"
              :label="column.label"
              min-width="180"
            >
              <template #default="{ row }">
                <template v-if="getMatrixResult(row, column)">
                  <div
                    :class="[
                      'geo-hit-summary-panel__matrix-cell',
                      getMatrixResultClass(getMatrixResult(row, column))
                    ]"
                  >
                    <el-tag :type="getHitLevelType(getMatrixResult(row, column)?.hitLevel)">
                      {{ formatHitLevel(getMatrixResult(row, column)?.hitLevel) }}
                    </el-tag>
                    <div class="geo-hit-summary-panel__signal-list">
                      <span
                        v-for="signal in getResultSignals(getMatrixResult(row, column))"
                        :key="signal"
                      >
                        {{ signal }}
                      </span>
                    </div>
                    <p class="geo-hit-summary-panel__checked-at">
                      {{ formatDateTime(getMatrixResult(row, column)?.checkedAt) }}
                    </p>
                  </div>
                </template>
                <el-tag v-else type="info">未检测</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="filteredPromptMatrix.length > matrixPageSize"
            v-model:current-page="matrixPage"
            class="geo-hit-summary-panel__pagination"
            background
            layout="prev, pager, next, total"
            :page-size="matrixPageSize"
            :total="filteredPromptMatrix.length"
          />
        </el-card>
      </el-collapse-item>
    </el-collapse>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>下一步建议</h3>
            <span>把现有优化建议整理成运营动作清单，不自动执行任何操作。</span>
          </div>
        </div>
      </template>
      <div class="geo-hit-summary-panel__action-grid">
        <article
          v-for="group in suggestionActionGroups"
          :key="group.key"
          class="geo-hit-summary-panel__action-card"
        >
          <div>
            <span>{{ group.description }}</span>
            <strong>{{ group.title }}</strong>
          </div>
          <ul v-if="group.items.length > 0">
            <li v-for="item in group.items.slice(0, 3)" :key="`${group.key}-${item.geoPromptId}`">
              <span>{{ item.promptText }}</span>
              <em>{{ item.suggestedAction }}</em>
            </li>
          </ul>
          <p v-else>{{ group.emptyText }}</p>
        </article>
      </div>
      <el-table
        v-loading="loading"
        :data="report?.optimizationSuggestions ?? []"
        border
        class="geo-hit-summary-panel__detail-table"
        empty-text="暂无待优化建议"
      >
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            {{ suggestionTypeLabelMap[row.type] ?? row.type }}
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">{{ formatPriority(row.priority) }}</template>
        </el-table-column>
        <el-table-column label="提示词" min-width="240" prop="promptText" />
        <el-table-column label="原因" min-width="240" prop="reason" />
        <el-table-column label="建议动作" min-width="280" prop="suggestedAction" />
      </el-table>
    </el-card>
  </section>
</template>

<style scoped>
.geo-hit-summary-panel {
  gap: 16px;
}

.geo-hit-summary-panel__stage,
.geo-hit-summary-panel__notice,
.geo-hit-summary-panel__insight {
  margin-bottom: 16px;
}

.geo-hit-summary-panel__notice p,
.geo-hit-summary-panel__stage :deep(.el-alert__description) {
  margin: 0;
  line-height: 1.7;
}

.geo-hit-summary-panel__insight-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.geo-hit-summary-panel__metric-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e5e0ef;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgb(243 239 255 / 70%), transparent 42%),
    #ffffff;
  box-shadow: 0 12px 32px rgb(24 20 36 / 5%);
}

.geo-hit-summary-panel__section-kicker {
  margin: 0 0 4px;
  color: var(--geo-primary);
  font-size: 12px;
  font-weight: 900;
}

.geo-hit-summary-panel__metric-section h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  line-height: 1.4;
}

.geo-hit-summary-panel__metric-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
}

.geo-hit-summary-panel__core-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.geo-hit-summary-panel__supporting-metrics {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e0ef;
  border-radius: 14px;
  background: #fbfaff;
}

.geo-hit-summary-panel__supporting-header {
  display: grid;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee9f5;
}

.geo-hit-summary-panel__supporting-header span,
.geo-hit-summary-panel__supporting-metrics article span,
.geo-hit-summary-panel__platform-head span,
.geo-hit-summary-panel__action-card > div span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 700;
}

.geo-hit-summary-panel__supporting-header strong {
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
}

.geo-hit-summary-panel__supporting-metrics article {
  display: grid;
  gap: 4px;
}

.geo-hit-summary-panel__supporting-metrics article strong {
  color: var(--el-text-color-primary);
  font-size: 20px;
  line-height: 1.2;
}

.geo-hit-summary-panel__supporting-metrics article p,
.geo-hit-summary-panel__platform-card p,
.geo-hit-summary-panel__action-card p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.geo-hit-summary-panel__platform-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.geo-hit-summary-panel__platform-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e5e0ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(24 20 36 / 4%);
}

.geo-hit-summary-panel__platform-card.is-good {
  border-color: #dff59c;
  background: #fbfff0;
}

.geo-hit-summary-panel__platform-card.is-warning {
  border-color: #f1d4ab;
  background: #fffaf2;
}

.geo-hit-summary-panel__platform-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.geo-hit-summary-panel__platform-head > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.geo-hit-summary-panel__platform-head strong {
  color: var(--el-text-color-primary);
  font-size: 16px;
  line-height: 1.35;
}

.geo-hit-summary-panel__platform-head em {
  flex: 0 0 auto;
  color: var(--geo-primary);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.geo-hit-summary-panel__platform-card dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.geo-hit-summary-panel__platform-card dl div {
  display: grid;
  gap: 4px;
}

.geo-hit-summary-panel__platform-card dt {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.geo-hit-summary-panel__platform-card dd {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 17px;
  font-weight: 750;
}

.geo-hit-summary-panel__detail-table {
  margin-top: 10px;
}

.geo-hit-summary-panel__matrix-guide {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #dff59c;
  border-radius: 12px;
  background: #f8ffe7;
  color: #426600;
  font-size: 13px;
  line-height: 1.6;
}

.geo-hit-summary-panel__matrix-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.geo-hit-summary-panel__prompt-cell {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.geo-hit-summary-panel__prompt-cell strong {
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

.geo-hit-summary-panel__prompt-cell span {
  width: fit-content;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.4;
}

.geo-hit-summary-panel__prompt-cell span.is-risk {
  background: #fff3e6;
  color: #9a5b13;
}

.geo-hit-summary-panel__prompt-cell span.is-ok {
  background: #f5ffd9;
  color: #426600;
}

.geo-hit-summary-panel__matrix-cell {
  display: grid;
  gap: 7px;
  min-height: 74px;
  padding: 8px;
  border-radius: 12px;
  background: #fbfaff;
}

.geo-hit-summary-panel__matrix-cell.is-risk {
  background: #fff5f2;
}

.geo-hit-summary-panel__matrix-cell.is-unclear {
  background: #f3f5f8;
}

.geo-hit-summary-panel__matrix-cell.is-watch {
  background: #fffaf2;
}

.geo-hit-summary-panel__matrix-cell.is-hit {
  background: #f8ffe7;
}

.geo-hit-summary-panel__signal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.geo-hit-summary-panel__signal-list span {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.geo-hit-summary-panel__checked-at {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.geo-hit-summary-panel__action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.geo-hit-summary-panel__action-card {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e5e0ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(24 20 36 / 4%);
}

.geo-hit-summary-panel__action-card > div {
  display: grid;
  gap: 5px;
}

.geo-hit-summary-panel__action-card > div strong {
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.geo-hit-summary-panel__action-card ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.geo-hit-summary-panel__action-card li {
  display: grid;
  gap: 3px;
  padding-top: 8px;
  border-top: 1px solid #eee9f5;
}

.geo-hit-summary-panel__action-card li span {
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1.45;
}

.geo-hit-summary-panel__action-card li em {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-style: normal;
  line-height: 1.5;
}

.geo-hit-summary-panel__pagination {
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 900px) {
  .geo-hit-summary-panel__metric-layout,
  .geo-hit-summary-panel__platform-grid,
  .geo-hit-summary-panel__action-grid {
    grid-template-columns: 1fr;
  }

  .geo-hit-summary-panel__core-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-hit-summary-panel__matrix-guide {
    align-items: flex-start;
    flex-direction: column;
  }

  .geo-hit-summary-panel__matrix-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

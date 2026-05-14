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

const metrics = computed(() => [
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
  },
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
    return ["暂无可解读的最新检测结果。当前包含测试数据，仅供调试参考。"];
  }

  const items: string[] = [];
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

  if (multiPlatformHitPrompts.length > 0) {
    items.push(`多平台已有命中的提示词：${multiPlatformHitPrompts.join("、")}。`);
  }

  items.push("当前包含测试数据，仅供调试参考。正式复盘前建议执行 Clean-Final 后再出具报告。");

  return items;
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
    <el-alert
      class="geo-hit-summary-panel__stage"
      show-icon
      type="warning"
      :closable="false"
      title="测试阶段提示"
    >
      当前项目仍处于测试阶段，汇总数据可能包含测试提示词、测试检测记录和重复检测结果。正式使用前可通过
      Clean-Final 统一清理测试数据，清理后再作为正式 GEO 效果报告使用。
    </el-alert>

    <el-alert class="geo-hit-summary-panel__notice" show-icon type="info" :closable="false">
      <p>本汇总默认按每个提示词 + 平台 + 入口的最新检测结果统计，避免重复测试记录影响判断。</p>
      <p>
        本页面当前展示系统内检测记录。测试阶段可能包含调试数据，正式使用前建议统一清理测试数据。
      </p>
      <p>官网引用率是辅助指标，不作为主要 GEO 命中判断。核心指标是品牌推荐率和品牌提及率。</p>
    </el-alert>

    <el-card class="geo-hit-summary-panel__insight" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>本轮结论 / 自动解读</h3>
            <span>基于当前接口返回结果的展示层解读；当前包含测试数据，仅供调试参考。</span>
          </div>
        </div>
      </template>
      <ul class="geo-hit-summary-panel__insight-list">
        <li v-for="item in conclusionItems" :key="item">{{ item }}</li>
      </ul>
    </el-card>

    <div class="report-metric-grid report-metric-grid--compact">
      <ReportMetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :description="metric.description"
        :label="metric.label"
        :loading="loading"
        :percent="metric.percent"
        :tone="metric.tone"
        :value="metric.value"
      />
    </div>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>平台对比</h3>
            <span>Kimi、豆包 / 火山方舟、通义千问 / 阿里云百炼等联网入口的最新结果对比。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.platformComparison ?? []"
        border
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
        empty-text="暂无提示词矩阵"
      >
        <el-table-column label="提示词" min-width="260" prop="promptText" fixed />
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
              <el-tag :type="getHitLevelType(getMatrixResult(row, column)?.hitLevel)">
                {{ formatHitLevel(getMatrixResult(row, column)?.hitLevel) }}
              </el-tag>
              <p class="geo-hit-summary-panel__checked-at">
                {{ formatDateTime(getMatrixResult(row, column)?.checkedAt) }}
              </p>
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

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>待优化提示词清单</h3>
            <span>根据最新命中状态生成下一步补资料、补内容或复测建议。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.optimizationSuggestions ?? []"
        border
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

.geo-hit-summary-panel__matrix-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.geo-hit-summary-panel__checked-at {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.geo-hit-summary-panel__pagination {
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 900px) {
  .geo-hit-summary-panel__matrix-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

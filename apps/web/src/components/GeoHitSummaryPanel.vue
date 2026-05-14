<script setup lang="ts">
import { computed } from "vue";
import type { GeoHitPromptMatrixItem, GeoHitSummaryReport } from "@/api/reports";
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

const metrics = computed(() => [
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
  },
  {
    label: "品牌提及率",
    value: formatReportPercent(props.report?.overview.brandMentionRate),
    description: "最新结果中有效提及目标品牌的比例",
    percent: toReportPercent(props.report?.overview.brandMentionRate),
    tone: "good" as const
  },
  {
    label: "品牌推荐率",
    value: formatReportPercent(props.report?.overview.brandRecommendRate),
    description: "最新结果中明确推荐目标品牌的比例",
    percent: toReportPercent(props.report?.overview.brandRecommendRate),
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
    description: "辅助指标：核心仍是品牌提及率和品牌推荐率",
    percent: toReportPercent(props.report?.overview.officialSiteCitationRate)
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
</script>

<template>
  <section class="report-panel geo-hit-summary-panel">
    <el-alert class="geo-hit-summary-panel__notice" show-icon type="info" :closable="false">
      <p>本汇总默认按每个提示词 + 平台 + 入口的最新检测结果统计，避免重复测试记录影响判断。</p>
      <p>官网引用率是辅助指标，核心指标是品牌提及率和品牌推荐率。</p>
    </el-alert>

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
            <span>每行一个 GEO 提示词，每列展示一个平台入口的最新命中状态。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.promptMatrix ?? []"
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

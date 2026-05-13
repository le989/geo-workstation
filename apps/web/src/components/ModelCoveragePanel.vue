<script setup lang="ts">
import { computed } from "vue";
import type { ModelCoveragePromptSummary, ModelCoverageReport } from "@/api/reports";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import ModelInclusionBooleanTag from "@/components/ModelInclusionBooleanTag.vue";
import ReportDistributionTable from "@/components/ReportDistributionTable.vue";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import { formatDateTime, formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import { formatReportNumber } from "@/config/report-options";

const props = defineProps<{
  report: ModelCoverageReport | null;
  loading?: boolean;
}>();

const metrics = computed(() => [
  {
    label: "覆盖记录",
    value: formatReportNumber(props.report?.totalRecords),
    description: "当前筛选范围内的模型覆盖样本"
  }
]);

const getUserIntentLabel = (row: ModelCoveragePromptSummary) =>
  userIntentLabelMap[row.userIntent as keyof typeof userIntentLabelMap] ?? row.userIntent;
</script>

<template>
  <section class="report-panel">
    <div class="report-metric-grid report-metric-grid--compact">
      <ReportMetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :description="metric.description"
        :label="metric.label"
        :loading="loading"
        :value="metric.value"
      />
    </div>

    <div class="report-distribution-grid report-distribution-grid--model">
      <ReportDistributionTable title="模型记录分布" :distribution="report?.modelDistribution" />
      <ReportDistributionTable title="品牌提及数" :distribution="report?.mentionedByModel" />
      <ReportDistributionTable title="品牌推荐数" :distribution="report?.recommendedByModel" />
      <ReportDistributionTable
        title="官网引用数"
        :distribution="report?.citedOfficialSiteByModel"
      />
      <ReportDistributionTable
        title="品牌提及率"
        :distribution="report?.brandMentionRateByModel"
        value-label="比例"
        value-type="rate"
      />
      <ReportDistributionTable
        title="品牌推荐率"
        :distribution="report?.brandRecommendRateByModel"
        value-label="比例"
        value-type="rate"
      />
    </div>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>已被推荐的提示词</h3>
            <span>用于判断哪些 GEO 问法已经产生品牌推荐信号。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.topRecommendedPrompts ?? []"
        border
        empty-text="暂无品牌推荐记录"
      >
        <el-table-column label="提示词" min-width="260" prop="promptText" fixed />
        <el-table-column label="模型" width="140" prop="model" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <GeoPromptTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column label="产品线" width="150">
          <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
        </el-table-column>
        <el-table-column label="用户意图" width="130">
          <template #default="{ row }">{{ getUserIntentLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="推荐位置" width="100">
          <template #default="{ row }">{{ row.rankingPosition ?? "--" }}</template>
        </el-table-column>
        <el-table-column label="官网引用" width="120">
          <template #default="{ row }">
            <ModelInclusionBooleanTag
              :value="row.citedOfficialSite"
              true-label="已引用官网"
              false-label="未引用官网"
            />
          </template>
        </el-table-column>
        <el-table-column label="检测时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>未提及品牌的提示词</h3>
            <span>这些提示词需要优先补内容、补资料或继续检测。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.notMentionedPrompts ?? []"
        border
        empty-text="暂无未提及品牌记录"
      >
        <el-table-column label="提示词" min-width="260" prop="promptText" fixed />
        <el-table-column label="模型" width="140" prop="model" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <GeoPromptTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column label="产品线" width="150">
          <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
        </el-table-column>
        <el-table-column label="品牌提及" width="110">
          <template #default="{ row }">
            <ModelInclusionBooleanTag
              :value="row.brandMentioned"
              true-label="已提及"
              false-label="未提及"
            />
          </template>
        </el-table-column>
        <el-table-column label="检测时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

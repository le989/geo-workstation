<script setup lang="ts">
import { computed } from "vue";
import type { PromptCoverageReport, ReportPromptSummary } from "@/api/reports";
import GeoPromptStatusTag from "@/components/GeoPromptStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import ReportDistributionTable from "@/components/ReportDistributionTable.vue";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import { formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import { formatReportNumber, formatReportPercent, toReportPercent } from "@/config/report-options";

const props = defineProps<{
  report: PromptCoverageReport | null;
  loading?: boolean;
}>();

const metrics = computed(() => [
  {
    label: "提示词总数",
    value: formatReportNumber(props.report?.totalPrompts),
    description: "当前筛选条件下的 GEO 提示词资产"
  },
  {
    label: "追踪提示词",
    value: formatReportNumber(props.report?.trackedPrompts),
    description: "需要持续检测模型表现的提示词"
  },
  {
    label: "已有覆盖",
    value: formatReportNumber(props.report?.promptsWithRecords),
    description: "已有模型覆盖记录的提示词",
    tone: "good" as const
  },
  {
    label: "未覆盖",
    value: formatReportNumber(props.report?.promptsWithoutRecords),
    description: "下一步需要补检测的提示词",
    tone:
      (props.report?.promptsWithoutRecords ?? 0) > 0 ? ("warning" as const) : ("default" as const)
  },
  {
    label: "覆盖率",
    value: formatReportPercent(props.report?.coverageRate),
    description: "有覆盖记录的提示词 / 提示词总数",
    percent: toReportPercent(props.report?.coverageRate)
  }
]);

const getUserIntentLabel = (row: ReportPromptSummary) =>
  userIntentLabelMap[row.userIntent as keyof typeof userIntentLabelMap] ?? row.userIntent;
</script>

<template>
  <section class="report-panel">
    <div class="report-metric-grid">
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

    <div class="report-distribution-grid">
      <ReportDistributionTable title="提示词类型分布" :distribution="report?.byType" />
      <ReportDistributionTable title="产品线分布" :distribution="report?.byProductLine" />
      <ReportDistributionTable title="用户意图分布" :distribution="report?.byUserIntent" />
      <ReportDistributionTable
        title="最新覆盖状态"
        :distribution="report?.byLatestCoverageStatus"
      />
    </div>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>高优先级未覆盖提示词</h3>
            <span>这些词适合优先补模型检测，必要时同步补内容和知识库事实。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.highPriorityUncoveredPrompts ?? []"
        border
        empty-text="暂无高优先级未覆盖提示词"
      >
        <el-table-column label="GEO 提示词" min-width="280" prop="promptText" fixed />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <GeoPromptTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column label="产品线" width="160">
          <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
        </el-table-column>
        <el-table-column label="用户意图" width="130">
          <template #default="{ row }">{{ getUserIntentLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="优先级" width="90" prop="priority" />
        <el-table-column label="最新覆盖状态" width="160">
          <template #default="{ row }">
            <GeoPromptStatusTag :status="row.latestCoverageStatus || 'unknown'" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

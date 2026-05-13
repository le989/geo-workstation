<script setup lang="ts">
import { computed } from "vue";
import type { ContentCoverageReport, ReportPromptSummary } from "@/api/reports";
import GeoPromptStatusTag from "@/components/GeoPromptStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import ReportDistributionTable from "@/components/ReportDistributionTable.vue";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import { formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import { formatReportNumber } from "@/config/report-options";

const props = defineProps<{
  report: ContentCoverageReport | null;
  loading?: boolean;
}>();

const metrics = computed(() => [
  {
    label: "内容任务",
    value: formatReportNumber(props.report?.contentTaskCount),
    description: "围绕 GEO 提示词创建的内容生产任务"
  },
  {
    label: "内容项",
    value: formatReportNumber(props.report?.contentItemCount),
    description: "已经沉淀的 GEO 内容资产"
  },
  {
    label: "已完成任务",
    value: formatReportNumber(props.report?.succeededTaskCount),
    description: "内容生成成功的任务",
    tone: "good" as const
  },
  {
    label: "失败任务",
    value: formatReportNumber(props.report?.failedTaskCount),
    description: "需要重试或补充输入的任务",
    tone: (props.report?.failedTaskCount ?? 0) > 0 ? ("danger" as const) : ("default" as const)
  },
  {
    label: "有内容提示词",
    value: formatReportNumber(props.report?.promptsWithContent),
    description: "已有内容资产支撑的提示词"
  },
  {
    label: "无内容提示词",
    value: formatReportNumber(props.report?.promptsWithoutContent),
    description: "下一步适合补内容的提示词",
    tone:
      (props.report?.promptsWithoutContent ?? 0) > 0 ? ("warning" as const) : ("default" as const)
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
        :tone="metric.tone"
        :value="metric.value"
      />
    </div>

    <div class="report-distribution-grid">
      <ReportDistributionTable
        title="生成类型分布"
        :distribution="report?.contentItemsByGenerationType"
      />
      <ReportDistributionTable
        title="产品线内容分布"
        :distribution="report?.contentItemsByProductLine"
      />
      <ReportDistributionTable title="内容项状态" :distribution="report?.contentItemsByStatus" />
    </div>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>高优先级无内容提示词</h3>
            <span>这些词缺少可被 AI 摘取和引用的内容资产，是内容生产优先队列。</span>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="report?.highPriorityPromptsWithoutContent ?? []"
        border
        empty-text="暂无高优先级无内容提示词"
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

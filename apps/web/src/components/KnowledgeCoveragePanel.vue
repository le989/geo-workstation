<script setup lang="ts">
import { computed } from "vue";
import type { KnowledgeCoverageReport } from "@/api/reports";
import ReportDistributionTable from "@/components/ReportDistributionTable.vue";
import ReportMetricCard from "@/components/ReportMetricCard.vue";
import { formatReportNumber } from "@/config/report-options";

const props = defineProps<{
  report: KnowledgeCoverageReport | null;
  loading?: boolean;
}>();

const missingKnowledgeHint =
  "这些产品线已有提示词资产，但缺少企业事实资料，应优先补产品、案例、FAQ 和资质。";

const metrics = computed(() => [
  {
    label: "知识库",
    value: formatReportNumber(props.report?.knowledgeBaseCount),
    description: "企业 GEO 知识资产集合"
  },
  {
    label: "文件资料",
    value: formatReportNumber(props.report?.knowledgeFileCount),
    description: "已上传并记录解析状态的资料"
  },
  {
    label: "知识片段",
    value: formatReportNumber(props.report?.knowledgeChunkCount),
    description: "可被 GEO 内容生成引用的事实片段"
  },
  {
    label: "缺资料产品线",
    value: formatReportNumber(props.report?.productLinesWithoutKnowledge.length),
    description: "有提示词但知识库资料不足的产品线",
    tone:
      (props.report?.productLinesWithoutKnowledge.length ?? 0) > 0
        ? ("warning" as const)
        : ("default" as const)
  }
]);
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
      <ReportDistributionTable title="产品线知识片段" :distribution="report?.chunksByProductLine" />
      <ReportDistributionTable title="资料类型分布" :distribution="report?.chunksByMaterialType" />
      <ReportDistributionTable title="文件解析状态" :distribution="report?.filesByParseStatus" />
    </div>

    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>缺知识库资料的产品线</h3>
            <span>{{ missingKnowledgeHint }}</span>
          </div>
        </div>
      </template>
      <el-empty
        v-if="!loading && (report?.productLinesWithoutKnowledge ?? []).length === 0"
        description="当前暂无明显缺知识库资料的产品线"
        :image-size="90"
      />
      <el-skeleton v-else-if="loading" animated :rows="3" />
      <div v-else class="report-tag-list">
        <el-tag
          v-for="productLine in report?.productLinesWithoutKnowledge ?? []"
          :key="productLine"
          effect="plain"
          type="warning"
        >
          {{ productLine }}
        </el-tag>
      </div>
    </el-card>
  </section>
</template>

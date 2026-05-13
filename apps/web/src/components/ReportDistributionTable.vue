<script setup lang="ts">
import { computed } from "vue";
import type { ReportDistribution } from "@/api/reports";
import { toDistributionRows } from "@/config/report-options";

const props = withDefaults(
  defineProps<{
    title: string;
    distribution?: ReportDistribution;
    valueLabel?: string;
    valueType?: "count" | "rate";
    emptyText?: string;
  }>(),
  {
    distribution: () => ({}),
    emptyText: "暂无分布数据",
    valueLabel: "数量",
    valueType: "count"
  }
);

const rows = computed(() => toDistributionRows(props.distribution, props.valueType));
const maxValue = computed(() => Math.max(...rows.value.map((item) => item.rawValue), 0));

const rowPercent = (value: number) => {
  if (props.valueType === "rate") {
    return Math.max(0, Math.min(100, value * 100));
  }

  return maxValue.value > 0 ? Math.round((value / maxValue.value) * 100) : 0;
};
</script>

<template>
  <el-card class="report-distribution-card" shadow="never">
    <template #header>
      <div class="report-card-header">
        <h3>{{ title }}</h3>
      </div>
    </template>

    <el-empty v-if="rows.length === 0" :description="emptyText" :image-size="80" />
    <el-table v-else :data="rows" border size="small">
      <el-table-column label="维度" min-width="160" prop="label" />
      <el-table-column :label="valueLabel" width="120" prop="value" />
      <el-table-column label="占比" min-width="180">
        <template #default="{ row }">
          <el-progress
            :percentage="rowPercent(row.rawValue)"
            :show-text="false"
            :stroke-width="7"
          />
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

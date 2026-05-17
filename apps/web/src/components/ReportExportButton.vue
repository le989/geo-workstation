<script setup lang="ts">
import { Download } from "@element-plus/icons-vue";
import type { ReportExportType } from "@/api/reports";
import { reportExportTypeLabelMap } from "@/config/report-options";

defineProps<{
  reportType: ReportExportType;
  exporting?: boolean;
}>();

const emit = defineEmits<{
  export: [reportType: ReportExportType];
}>();
</script>

<template>
  <el-button :icon="Download" :loading="exporting" @click="emit('export', reportType)">
    导出当前报表
    <span class="report-export-button__label">{{ reportExportTypeLabelMap[reportType] }}</span>
  </el-button>
</template>

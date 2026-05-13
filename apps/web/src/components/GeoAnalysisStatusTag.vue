<script setup lang="ts">
import type { TaskStatus } from "@/api/content";
import {
  geoAnalysisStatusLabelMap,
  geoAnalysisStatusTagTypeMap
} from "@/config/geo-analysis-options";

defineProps<{
  status?: TaskStatus;
}>();
</script>

<template>
  <el-tag :type="status ? geoAnalysisStatusTagTypeMap[status] : 'info'" effect="plain">
    {{ status ? geoAnalysisStatusLabelMap[status] : "未知" }}
  </el-tag>
</template>

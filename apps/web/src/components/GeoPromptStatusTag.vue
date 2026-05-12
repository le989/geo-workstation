<script setup lang="ts">
import { coverageStatusLabelMap } from "@/config/geo-prompt-options";

const props = defineProps<{
  status?: string;
}>();

const statusTypeMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  mentioned: "warning",
  not_mentioned: "danger",
  recommended: "success",
  unknown: "info"
};

const normalizedStatus = () => props.status || "unknown";
</script>

<template>
  <el-tag :type="statusTypeMap[normalizedStatus()] ?? 'info'" effect="plain">
    {{ coverageStatusLabelMap[normalizedStatus()] ?? "未知" }}
  </el-tag>
</template>

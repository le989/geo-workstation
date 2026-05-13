<script setup lang="ts">
import type { TaskStatus } from "@/api/content";
import { contentTaskStatusLabelMap } from "@/config/content-options";

const props = defineProps<{
  status: TaskStatus | string;
}>();

const tagTypeMap: Record<string, "success" | "primary" | "warning" | "info" | "danger"> = {
  cancelled: "info",
  failed: "danger",
  pending: "info",
  running: "warning",
  succeeded: "success"
};
</script>

<template>
  <el-tag :type="tagTypeMap[props.status] ?? 'info'" effect="plain">
    {{ contentTaskStatusLabelMap[props.status as TaskStatus] ?? props.status }}
  </el-tag>
</template>

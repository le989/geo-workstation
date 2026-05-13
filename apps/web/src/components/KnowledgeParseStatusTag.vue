<script setup lang="ts">
import type { ParseStatus } from "@/api/knowledge";
import { parseStatusLabelMap } from "@/config/knowledge-options";

const props = defineProps<{
  status?: ParseStatus | string;
}>();

const tagTypeMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  failed: "danger",
  parsing: "warning",
  pending: "info",
  succeeded: "success"
};
</script>

<template>
  <el-tag :type="tagTypeMap[props.status ?? 'pending'] ?? 'info'" effect="plain">
    {{ parseStatusLabelMap[props.status as ParseStatus] ?? props.status ?? "待解析" }}
  </el-tag>
</template>

<script setup lang="ts">
import type { RecordMethod } from "@/api/model-inclusion";
import { recordMethodLabelMap } from "@/config/model-inclusion-options";

const props = defineProps<{
  method: RecordMethod | string;
}>();

const tagTypeMap: Record<string, "primary" | "success" | "warning" | "info"> = {
  api: "primary",
  import: "warning",
  manual: "success"
};
</script>

<template>
  <el-tag :type="tagTypeMap[props.method] ?? 'info'" effect="plain">
    {{ recordMethodLabelMap[props.method as RecordMethod] ?? props.method }}
  </el-tag>
</template>

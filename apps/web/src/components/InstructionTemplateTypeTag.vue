<script setup lang="ts">
import { instructionTypeLabelMap } from "@/config/instruction-options";

const props = defineProps<{
  type?: string;
}>();
</script>

<template>
  <el-tag type="success" effect="plain">
    {{ instructionTypeLabelMap[props.type ?? ""] ?? props.type ?? "--" }}
  </el-tag>
</template>

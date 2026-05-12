<script setup lang="ts">
import type { GeoPromptType } from "@/api/geo-prompts";
import { geoPromptTypeLabelMap } from "@/config/geo-prompt-options";

const props = defineProps<{
  type: GeoPromptType;
}>();

const tagTypeMap: Record<GeoPromptType, "success" | "primary" | "warning" | "info"> = {
  base: "success",
  brand: "warning",
  distilled: "primary",
  scene: "info"
};
</script>

<template>
  <el-tag :type="tagTypeMap[props.type]" effect="plain">
    {{ geoPromptTypeLabelMap[props.type] }}
  </el-tag>
</template>

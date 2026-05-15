<script setup lang="ts">
import { generationTypeLabelMap } from "@/config/content-options";

const props = defineProps<{
  type: string;
}>();
</script>

<template>
  <el-tag class="content-generation-type-tag" type="primary" effect="plain">
    {{ generationTypeLabelMap[props.type] ?? props.type }}
  </el-tag>
</template>

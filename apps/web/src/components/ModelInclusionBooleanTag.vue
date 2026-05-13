<script setup lang="ts">
const props = defineProps<{
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}>();
</script>

<template>
  <el-tag :type="props.value ? 'success' : 'info'" effect="plain">
    {{ props.value ? props.trueLabel : props.falseLabel }}
  </el-tag>
</template>

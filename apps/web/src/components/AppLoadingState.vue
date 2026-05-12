<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
  }>(),
  {
    title: "正在加载 GEO 数据"
  }
);
</script>

<template>
  <section class="state-panel" aria-live="polite">
    <p class="state-title">{{ title }}</p>
    <el-skeleton animated :rows="3" />
  </section>
</template>

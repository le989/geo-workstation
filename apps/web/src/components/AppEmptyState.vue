<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: "当前页面正在准备",
    description: "此处将承载 GEO 运营流程中的具体数据、表单和操作。"
  }
);
</script>

<template>
  <el-empty :description="description" class="app-empty-state">
    <template #image>
      <div class="empty-mark">GEO</div>
    </template>
    <strong>{{ title }}</strong>
  </el-empty>
</template>

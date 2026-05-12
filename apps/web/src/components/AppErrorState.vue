<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
  }>(),
  {
    title: "暂时无法获取数据",
    message: "请稍后重试，或检查本地 API 服务是否已经启动。"
  }
);
</script>

<template>
  <el-alert :title="title" :description="message" type="error" :closable="false" show-icon />
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  lookup: [jobId: string];
}>();

const jobId = ref("");
const localError = ref("");

const handleLookup = () => {
  localError.value = "";
  const trimmed = jobId.value.trim();

  if (!trimmed) {
    localError.value = "请输入拓词任务 jobId。";
    return;
  }

  emit("lookup", trimmed);
};
</script>

<template>
  <section class="expansion-lookup-panel">
    <div>
      <p class="section-kicker">任务查询</p>
      <h2>查询拓词任务详情</h2>
      <p>输入拓词任务 ID 可查看历史拓词候选、重复标记和保存状态。</p>
    </div>
    <el-alert
      v-if="localError"
      :title="localError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <div class="expansion-lookup-form">
      <el-input v-model="jobId" placeholder="输入拓词任务 ID" @keyup.enter="handleLookup" />
      <el-button type="primary" :loading="loading" @click="handleLookup">查询任务详情</el-button>
    </div>
  </section>
</template>

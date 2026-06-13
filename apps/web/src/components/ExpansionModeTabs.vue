<script setup lang="ts">
import type { ExpansionMode } from "@/api/expansion";

defineProps<{
  modelValue: ExpansionMode;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ExpansionMode];
}>();

const handleTabChange = (name: string | number) => {
  emit("update:modelValue", name as ExpansionMode);
};
</script>

<template>
  <section class="expansion-mode-panel">
    <div class="expansion-mode-panel__copy">
      <p class="section-kicker">生成方式</p>
      <h2>选择拓词方式</h2>
    </div>
    <el-tabs :model-value="modelValue" class="expansion-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="规则拓词" name="rule" />
      <el-tab-pane label="AI 拓词" name="ai" />
    </el-tabs>
  </section>
</template>

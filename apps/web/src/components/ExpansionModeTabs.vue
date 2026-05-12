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
      <p class="section-kicker">Expansion Mode</p>
      <h2>拓词方式</h2>
      <p>先生成候选词，再由运营人工判断是否保存到提示词策略库。</p>
    </div>
    <el-alert
      title="当前阶段使用 Mock AI，不会调用真实 DeepSeek / 豆包 / Kimi / 通义。"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-tabs :model-value="modelValue" class="expansion-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="手动组合" name="rule" />
      <el-tab-pane label="Mock AI 拓词" name="ai" />
    </el-tabs>
  </section>
</template>

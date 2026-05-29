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
      <p>先生成用户可能会向 AI 提出的问题候选，再由运营人工判断是否保存到提示词策略库。</p>
      <div class="expansion-mode-guides" aria-label="拓词方式说明">
        <span>规则拓词：按前缀、训练词和场景后缀组合，适合快速铺开方向。</span>
        <span>AI 拓词：可能调用模型生成候选，生成前先确认 Provider 与额度边界。</span>
      </div>
    </div>
    <el-alert
      title="拓词结果用于内部分析与内容优化参考，候选词需人工确认后才会保存到提示词策略库。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-tabs :model-value="modelValue" class="expansion-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="规则拓词" name="rule" />
      <el-tab-pane label="AI 拓词" name="ai" />
    </el-tabs>
  </section>
</template>

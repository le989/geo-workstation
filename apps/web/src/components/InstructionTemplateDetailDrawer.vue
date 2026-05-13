<script setup lang="ts">
import type { InstructionTemplate } from "@/api/instructions";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  contentTypeLabelMap,
  formatInstructionText,
  instructionTypeLabelMap,
  targetPromptTypeLabelMap
} from "@/config/instruction-options";

const props = defineProps<{
  modelValue: boolean;
  template?: InstructionTemplate | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="720px"
    :with-header="false"
    class="instruction-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="instruction-detail">
      <div class="instruction-detail-header">
        <div>
          <el-tag type="success" effect="plain">GEO Instruction Library</el-tag>
          <h2>{{ props.template?.name ?? "指令模板详情" }}</h2>
          <p>查看这条指令如何指导 GEO 内容生成，而不是作为普通 prompt 收藏。</p>
        </div>
        <el-button @click="close">关闭</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else-if="template">
        <el-descriptions :column="2" border class="instruction-detail-summary">
          <el-descriptions-item label="指令名称" :span="2">
            {{ template.name }}
          </el-descriptions-item>
          <el-descriptions-item label="指令类型">
            {{ instructionTypeLabelMap[template.instructionType] ?? template.instructionType }}
          </el-descriptions-item>
          <el-descriptions-item label="内容类型">
            {{ contentTypeLabelMap[template.contentType] ?? template.contentType }}
          </el-descriptions-item>
          <el-descriptions-item label="适用提示词类型">
            {{
              template.targetPromptType ? targetPromptTypeLabelMap[template.targetPromptType] : "--"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="适用模型">
            {{ formatOptional(template.targetModel) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(template.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(template.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="instruction-readable-block">
          <p class="section-kicker">Instruction</p>
          <h3>指令正文</h3>
          <pre>{{ formatInstructionText(template.instruction) }}</pre>
        </div>
        <div class="instruction-readable-grid">
          <div class="instruction-readable-block">
            <p class="section-kicker">Output Format</p>
            <h3>输出格式</h3>
            <pre>{{ formatInstructionText(template.outputFormat) }}</pre>
          </div>
          <div class="instruction-readable-block">
            <p class="section-kicker">Quality Rules</p>
            <h3>质量要求</h3>
            <pre>{{ formatInstructionText(template.qualityRules) }}</pre>
          </div>
          <div class="instruction-readable-block">
            <p class="section-kicker">Forbidden Rules</p>
            <h3>禁用规则</h3>
            <pre>{{ formatInstructionText(template.forbiddenRules) }}</pre>
          </div>
        </div>
      </template>
    </section>
  </el-drawer>
</template>

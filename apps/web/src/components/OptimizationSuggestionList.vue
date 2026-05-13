<script setup lang="ts">
import type { OptimizationSuggestion } from "@/api/reports";
import AppErrorState from "./AppErrorState.vue";

defineProps<{
  items: OptimizationSuggestion[];
  loading: boolean;
  errorMessage: string;
}>();

const typeLabels: Record<OptimizationSuggestion["type"], string> = {
  failed_content_task: "内容任务失败",
  product_line_without_knowledge: "缺知识库资料",
  prompt_not_mentioned: "品牌未提及",
  prompt_without_content: "缺内容资产",
  prompt_without_record: "缺覆盖记录"
};

const priorityType = (priority: number) => {
  if (priority >= 5) {
    return "danger";
  }

  if (priority >= 4) {
    return "warning";
  }

  return "info";
};
</script>

<template>
  <div class="suggestion-list">
    <AppErrorState v-if="errorMessage" title="待优化建议加载失败" :message="errorMessage" />

    <el-skeleton v-else-if="loading" animated :rows="6" />

    <el-empty v-else-if="items.length === 0" description="当前暂无明显待优化项" />

    <div v-else class="suggestion-task-list">
      <article v-for="item in items" :key="`${item.type}-${item.title}`" class="suggestion-task">
        <div class="suggestion-task__status">
          <el-tag effect="plain">
            {{ typeLabels[item.type as OptimizationSuggestion["type"]] }}
          </el-tag>
          <el-tag :type="priorityType(item.priority)" effect="dark">P{{ item.priority }}</el-tag>
        </div>
        <div class="suggestion-task__body">
          <strong>{{ item.title }}</strong>
          <p>{{ item.reason }}</p>
          <small>建议动作：{{ item.suggestedAction }}</small>
        </div>
        <div class="suggestion-task__meta">
          <span>{{ item.relatedPromptText || "未关联提示词" }}</span>
          <small>{{ item.relatedProductLine || "--" }} / {{ item.relatedModel || "--" }}</small>
        </div>
      </article>
    </div>
  </div>
</template>

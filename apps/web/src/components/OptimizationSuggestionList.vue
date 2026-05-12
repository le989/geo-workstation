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

    <el-table v-else :data="items" class="suggestion-table">
      <el-table-column label="类型" min-width="126">
        <template #default="{ row }">
          <el-tag effect="plain">
            {{ typeLabels[row.type as OptimizationSuggestion["type"]] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="96">
        <template #default="{ row }">
          <el-tag :type="priorityType(row.priority)" effect="dark">P{{ row.priority }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="reason" label="原因" min-width="260" show-overflow-tooltip />
      <el-table-column
        prop="suggestedAction"
        label="建议动作"
        min-width="260"
        show-overflow-tooltip
      />
      <el-table-column label="关联提示词" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.relatedPromptText || "--" }}</template>
      </el-table-column>
      <el-table-column label="产品线 / 模型" min-width="160">
        <template #default="{ row }">
          <span>{{ row.relatedProductLine || "--" }}</span>
          <small>{{ row.relatedModel || "--" }}</small>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

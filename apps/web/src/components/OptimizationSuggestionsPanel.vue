<script setup lang="ts">
import type { OptimizationSuggestion } from "@/api/reports";
import { formatOptional } from "@/config/geo-prompt-options";
import { optimizationSuggestionTypeLabelMap } from "@/config/report-options";

defineProps<{
  suggestions: OptimizationSuggestion[];
  loading?: boolean;
}>();

const typeTag = (type: string) => {
  if (type === "prompt_without_record" || type === "prompt_without_content") {
    return "warning";
  }
  if (type === "prompt_not_mentioned" || type === "failed_content_task") {
    return "danger";
  }
  return "info";
};
</script>

<template>
  <section class="report-panel">
    <el-card class="report-table-card" shadow="never">
      <template #header>
        <div class="report-card-header">
          <div>
            <h3>optimization suggestions GEO 优化建议</h3>
            <span>用规则把缺检测、缺内容、缺资料和失败任务整理为下一步运营动作。</span>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="suggestions"
        border
        empty-text="当前暂无明显待优化项"
        class="report-suggestion-table"
      >
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" effect="plain">
              {{ optimizationSuggestionTypeLabelMap[row.type] ?? row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="priority" width="90" prop="priority" />
        <el-table-column label="建议" min-width="260">
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <p class="table-subtext">{{ row.reason }}</p>
          </template>
        </el-table-column>
        <el-table-column label="suggestedAction" min-width="260" prop="suggestedAction" />
        <el-table-column label="relatedPromptText" min-width="240">
          <template #default="{ row }">{{ formatOptional(row.relatedPromptText) }}</template>
        </el-table-column>
        <el-table-column label="relatedProductLine" width="170">
          <template #default="{ row }">{{ formatOptional(row.relatedProductLine) }}</template>
        </el-table-column>
        <el-table-column label="relatedModel" width="150">
          <template #default="{ row }">{{ formatOptional(row.relatedModel) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

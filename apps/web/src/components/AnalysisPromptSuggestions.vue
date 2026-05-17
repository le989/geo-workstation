<script setup lang="ts">
import { computed, watch } from "vue";
import type { AnalysisPromptSuggestion } from "@/api/geo-analysis";
import { generationTypeLabelMap } from "@/config/content-options";
import { formatGeoAnalysisDisplayText } from "@/config/geo-analysis-options";
import { contentTypeLabelMap as instructionContentTypeLabelMap } from "@/config/instruction-options";
import { contentTypeLabelMap as expansionContentTypeLabelMap } from "@/config/expansion-options";
import { userIntentLabelMap } from "@/config/geo-prompt-options";

const props = defineProps<{
  suggestions: AnalysisPromptSuggestion[];
  selectedPromptTexts: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:selectedPromptTexts": [value: string[]];
}>();

const allPromptTexts = computed(() => props.suggestions.map((item) => item.promptText));
const allSelected = computed(
  () =>
    allPromptTexts.value.length > 0 &&
    allPromptTexts.value.every((promptText) => props.selectedPromptTexts.includes(promptText))
);

watch(
  () => props.suggestions,
  (suggestions) => {
    const promptTexts = suggestions.map((item) => item.promptText);
    const nextSelected = props.selectedPromptTexts.filter((promptText) =>
      promptTexts.includes(promptText)
    );
    if (nextSelected.length !== props.selectedPromptTexts.length) {
      emit("update:selectedPromptTexts", nextSelected);
    }
  }
);

const toggle = (promptText: string, checked: boolean) => {
  if (checked) {
    emit("update:selectedPromptTexts", [...new Set([...props.selectedPromptTexts, promptText])]);
    return;
  }
  emit(
    "update:selectedPromptTexts",
    props.selectedPromptTexts.filter((item) => item !== promptText)
  );
};

const selectAll = () => {
  emit("update:selectedPromptTexts", allPromptTexts.value);
};

const clearSelected = () => {
  emit("update:selectedPromptTexts", []);
};

const getUserIntentLabel = (suggestion: AnalysisPromptSuggestion) =>
  suggestion.userIntent
    ? (userIntentLabelMap[suggestion.userIntent] ?? suggestion.userIntent)
    : "--";

const getContentTypeLabel = (suggestion: AnalysisPromptSuggestion) =>
  suggestion.recommendedContentType
    ? (expansionContentTypeLabelMap[suggestion.recommendedContentType] ??
      generationTypeLabelMap[suggestion.recommendedContentType] ??
      instructionContentTypeLabelMap[suggestion.recommendedContentType] ??
      suggestion.recommendedContentType)
    : "--";
</script>

<template>
  <section class="analysis-suggestions">
    <div class="suggestion-toolbar">
      <div>
        <p class="section-kicker">提示词建议</p>
        <h3>提示词缺口建议</h3>
        <p>这些问题更接近用户向 AI 提问的方式，可勾选后转入提示词策略库。</p>
      </div>
      <div class="suggestion-actions">
        <el-button size="small" :disabled="disabled || allSelected" @click="selectAll">
          全选建议
        </el-button>
        <el-button
          size="small"
          :disabled="disabled || selectedPromptTexts.length === 0"
          @click="clearSelected"
        >
          清空选择
        </el-button>
      </div>
    </div>

    <el-table
      :data="suggestions"
      border
      row-key="promptText"
      empty-text="暂无提示词建议"
      class="analysis-suggestion-table"
    >
      <el-table-column label="选择" width="72" fixed>
        <template #default="{ row }">
          <el-checkbox
            :model-value="selectedPromptTexts.includes(row.promptText)"
            :disabled="disabled"
            @change="toggle(row.promptText, Boolean($event))"
          />
        </template>
      </el-table-column>
      <el-table-column label="GEO 提示词建议" min-width="260">
        <template #default="{ row }">
          <strong>{{ formatGeoAnalysisDisplayText(row.promptText, "GEO 提示词建议") }}</strong>
          <p class="table-subtext">{{ row.reason || "用于补齐 AI 问答场景中的提示词资产。" }}</p>
        </template>
      </el-table-column>
      <el-table-column label="用户意图" width="130">
        <template #default="{ row }">
          {{ getUserIntentLabel(row) }}
        </template>
      </el-table-column>
      <el-table-column label="推荐内容类型" width="150">
        <template #default="{ row }">
          {{ getContentTypeLabel(row) }}
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.analysis-suggestions {
  display: grid;
  gap: 14px;
}

.suggestion-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.suggestion-toolbar h3 {
  margin: 4px 0;
  color: #1f2937;
}

.suggestion-toolbar p {
  margin: 0;
  color: #64748b;
}

.suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.analysis-suggestion-table {
  width: 100%;
}
</style>

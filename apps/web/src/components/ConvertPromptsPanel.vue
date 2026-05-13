<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type {
  AnalysisPromptSuggestion,
  ConvertAnalysisPromptsPayload,
  ConvertAnalysisPromptsResult
} from "@/api/geo-analysis";
import type { GeoPromptType, UserIntent } from "@/api/geo-prompts";
import AnalysisPromptSuggestions from "@/components/AnalysisPromptSuggestions.vue";
import { convertPromptReasonLabelMap, defaultTargetModels } from "@/config/geo-analysis-options";
import {
  geoPromptTypeOptions,
  userIntentOptions,
  userIntentLabelMap
} from "@/config/geo-prompt-options";

const props = defineProps<{
  suggestions: AnalysisPromptSuggestion[];
  productLine?: string;
  submitting?: boolean;
  result?: ConvertAnalysisPromptsResult | null;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  submit: [payload: ConvertAnalysisPromptsPayload];
}>();

const selectedPromptTexts = defineModel<string[]>("selectedPromptTexts", {
  default: () => []
});

const form = reactive({
  createdBy: "",
  priority: 3,
  productLine: "",
  promptType: "distilled" as GeoPromptType,
  trackEnabled: true,
  userIntent: "" as UserIntent | ""
});

const selectedCount = computed(() => selectedPromptTexts.value.length);
const canSubmit = computed(() => selectedCount.value > 0 && !props.submitting);

watch(
  () => props.productLine,
  (productLine) => {
    form.productLine = productLine ?? "";
  },
  { immediate: true }
);

watch(
  () => props.suggestions,
  (suggestions) => {
    if (selectedPromptTexts.value.length === 0 && suggestions.length > 0) {
      selectedPromptTexts.value = suggestions.map((item) => item.promptText);
    }
  },
  { immediate: true }
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const handleSubmit = () => {
  if (!canSubmit.value) {
    return;
  }

  emit("submit", {
    createdBy: trimOptional(form.createdBy),
    priority: form.priority,
    productLine: trimOptional(form.productLine),
    promptType: form.promptType,
    selectedPromptTexts: selectedPromptTexts.value,
    trackEnabled: form.trackEnabled,
    userIntent: form.userIntent || undefined
  });
};
</script>

<template>
  <el-card shadow="never" class="convert-panel">
    <template #header>
      <div class="convert-header">
        <div>
          <p class="section-kicker">转入 GEO 提示词</p>
          <h3>转入提示词库</h3>
          <p>将分析任务中的提示词建议转入提示词策略库，后端会按未软删除提示词去重。</p>
        </div>
        <el-tag type="success" effect="plain">默认追踪</el-tag>
      </div>
    </template>

    <AnalysisPromptSuggestions
      v-model:selected-prompt-texts="selectedPromptTexts"
      :suggestions="suggestions"
      :disabled="submitting"
    />

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="convert-form" label-position="top">
      <el-form-item label="提示词类型">
        <el-select v-model="form.promptType">
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="默认使用分析任务产品线" />
      </el-form-item>
      <el-form-item label="用户意图">
        <el-select v-model="form.userIntent" clearable placeholder="可选：默认使用建议意图">
          <el-option
            v-for="option in userIntentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="1" :max="5" />
      </el-form-item>
      <el-form-item label="是否追踪">
        <el-switch v-model="form.trackEnabled" active-text="追踪" inactive-text="不追踪" />
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
    </el-form>

    <div class="convert-actions">
      <p>
        已选择 {{ selectedCount }} 条建议。目标模型会继承分析任务，例如
        {{ defaultTargetModels.join(" / ") }}。
      </p>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
        转入提示词库
      </el-button>
    </div>

    <section v-if="result" class="convert-result">
      <el-statistic title="已选择" :value="result.totalSelected" />
      <el-statistic title="新建成功" :value="result.createdCount" />
      <el-statistic title="重复跳过" :value="result.skippedCount" />

      <div class="result-list">
        <h4>已创建提示词</h4>
        <el-empty v-if="result.createdItems.length === 0" description="暂无新建提示词" />
        <div v-for="item in result.createdItems" :key="item.id" class="result-item">
          <strong>{{ item.promptText }}</strong>
          <span>{{ userIntentLabelMap[item.userIntent] ?? item.userIntent }}</span>
        </div>
      </div>

      <div class="result-list">
        <h4>跳过项</h4>
        <el-empty v-if="result.skippedItems.length === 0" description="暂无跳过项" />
        <div v-for="item in result.skippedItems" :key="item.promptText" class="result-item">
          <strong>{{ item.promptText }}</strong>
          <span>{{ convertPromptReasonLabelMap[item.reason] ?? item.reason }}</span>
        </div>
      </div>
    </section>
  </el-card>
</template>

<style scoped>
.convert-panel {
  border-radius: 8px;
}

.convert-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.convert-header h3 {
  margin: 4px 0;
  color: #1f2937;
}

.convert-header p {
  margin: 0;
  color: #64748b;
}

.convert-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
  margin-top: 16px;
}

.convert-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 12px;
}

.convert-actions p {
  margin: 0;
  color: #64748b;
}

.convert-result {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.result-list {
  grid-column: span 3;
  display: grid;
  gap: 8px;
}

.result-list h4 {
  margin: 0;
  color: #1f2937;
}

.result-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 900px) {
  .convert-form,
  .convert-result {
    grid-template-columns: 1fr;
  }

  .result-list {
    grid-column: span 1;
  }

  .convert-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type {
  CreateAnalysisContentTaskPayload,
  GeoAnalysisTask,
  RelatedAnalysisPrompt
} from "@/api/geo-analysis";
import { getInstructionTemplates, type InstructionTemplate } from "@/api/instructions";
import { getKnowledgeBases, type KnowledgeBase } from "@/api/knowledge";
import GeoPromptSelector from "@/components/GeoPromptSelector.vue";
import { generationTypeOptions } from "@/config/content-options";
import { formatOptional } from "@/config/geo-prompt-options";
import { contentTypeLabelMap, instructionTypeLabelMap } from "@/config/instruction-options";

const props = defineProps<{
  task?: GeoAnalysisTask;
  relatedPrompts: RelatedAnalysisPrompt[];
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  submit: [payload: CreateAnalysisContentTaskPayload];
}>();

const form = reactive({
  generationType: "article",
  geoPromptIds: [] as string[],
  instructionTemplateId: "",
  knowledgeBaseId: "",
  name: "",
  targetModel: ""
});

const loadingOptions = ref(false);
const selectError = ref("");
const knowledgeBases = ref<KnowledgeBase[]>([]);
const instructionTemplates = ref<InstructionTemplate[]>([]);

const selectedKnowledgeBase = computed(() =>
  knowledgeBases.value.find((item) => item.id === form.knowledgeBaseId)
);
const selectedInstructionTemplate = computed(() =>
  instructionTemplates.value.find((item) => item.id === form.instructionTemplateId)
);
const relatedPromptIds = computed(() => props.relatedPrompts.map((prompt) => prompt.id));
const selectedInstructionContentTypeLabel = computed(() =>
  selectedInstructionTemplate.value
    ? (contentTypeLabelMap[selectedInstructionTemplate.value.contentType] ??
      selectedInstructionTemplate.value.contentType)
    : ""
);

const loadOptions = async () => {
  loadingOptions.value = true;
  selectError.value = "";

  try {
    const [knowledgeResult, instructionResult] = await Promise.all([
      getKnowledgeBases({ page: 1, pageSize: 100 }),
      getInstructionTemplates({ page: 1, pageSize: 100 })
    ]);
    knowledgeBases.value = knowledgeResult.items;
    instructionTemplates.value = instructionResult.items;
  } catch (error) {
    selectError.value =
      error instanceof Error
        ? `${error.message}。后端未连接时仍可查看分析结果。`
        : "知识库或指令模板加载失败。";
    knowledgeBases.value = [];
    instructionTemplates.value = [];
  } finally {
    loadingOptions.value = false;
  }
};

watch(
  () => props.task?.id,
  () => {
    form.name = props.task ? `${props.task.name} 内容补齐任务` : "";
    form.targetModel = props.task?.targetModels[0] ?? "";
    form.geoPromptIds = [];
  },
  { immediate: true }
);

watch(
  () => props.task,
  (task) => {
    if (task) {
      void loadOptions();
    }
  },
  { immediate: true }
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const selectRelatedPrompts = () => {
  form.geoPromptIds = relatedPromptIds.value;
};

const handleSubmit = () => {
  emit("submit", {
    generationType: trimOptional(form.generationType) ?? "article",
    geoPromptIds: form.geoPromptIds,
    instructionTemplateId: trimOptional(form.instructionTemplateId),
    knowledgeBaseId: trimOptional(form.knowledgeBaseId),
    name: trimOptional(form.name),
    targetModel: trimOptional(form.targetModel)
  });
};
</script>

<template>
  <el-card shadow="never" class="analysis-content-task-panel">
    <template #header>
      <div class="content-task-panel-header">
        <div>
          <p class="section-kicker">创建内容任务</p>
          <h3>基于分析任务创建内容任务</h3>
          <p>把提示词缺口转为 GEO 内容补齐动作，复用模拟内容生成链路，不接真实 AI。</p>
        </div>
        <el-tag type="warning" effect="plain">模拟内容生成</el-tag>
      </div>
    </template>

    <el-alert
      title="如果不手动选择 GEO 提示词，后端会优先使用已由本分析任务转入的提示词；没有时会尝试自动转入建议。"
      type="info"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="errorMessage || selectError"
      :title="errorMessage || selectError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="analysis-content-task-form" label-position="top">
      <el-form-item label="任务名称">
        <el-input v-model="form.name" placeholder="默认：分析任务名称 + 内容补齐任务" />
      </el-form-item>
      <el-form-item label="生成类型">
        <el-select v-model="form.generationType" filterable allow-create>
          <el-option
            v-for="option in generationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标模型">
        <el-input v-model="form.targetModel" placeholder="默认使用分析任务第一个目标模型" />
      </el-form-item>
      <el-form-item label="知识库">
        <el-select
          v-model="form.knowledgeBaseId"
          clearable
          filterable
          :loading="loadingOptions"
          placeholder="可选：选择企业 GEO 知识库"
        >
          <el-option
            v-for="item in knowledgeBases"
            :key="item.id"
            :label="`${item.name} / ${formatOptional(item.productLine)}`"
            :value="item.id"
          />
        </el-select>
        <p v-if="selectedKnowledgeBase" class="form-help">
          将引用 {{ selectedKnowledgeBase.name }} 中的企业事实资料。
        </p>
      </el-form-item>
      <el-form-item label="指令模板">
        <el-select
          v-model="form.instructionTemplateId"
          clearable
          filterable
          :loading="loadingOptions"
          placeholder="可选：选择 GEO 指令模板"
        >
          <el-option
            v-for="item in instructionTemplates"
            :key="item.id"
            :label="`${item.name} / ${instructionTypeLabelMap[item.instructionType] ?? item.instructionType}`"
            :value="item.id"
          />
        </el-select>
        <p v-if="selectedInstructionTemplate" class="form-help">
          内容类型：{{ selectedInstructionContentTypeLabel }}
        </p>
      </el-form-item>
      <el-form-item label="选择 GEO 提示词" class="form-span-3">
        <div class="related-prompt-actions">
          <el-button
            size="small"
            :disabled="relatedPromptIds.length === 0"
            @click="selectRelatedPrompts"
          >
            使用已转入提示词
          </el-button>
          <span>已选择 {{ form.geoPromptIds.length }} 个 GEO 提示词</span>
        </div>
        <GeoPromptSelector v-model="form.geoPromptIds" :disabled="submitting" />
      </el-form-item>
    </el-form>

    <div class="content-task-submit">
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        创建内容任务
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.content-task-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.content-task-panel-header h3 {
  margin: 4px 0;
  color: #1f2937;
}

.content-task-panel-header p {
  margin: 0;
  color: #64748b;
}

.analysis-content-task-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-span-3 {
  grid-column: 1 / -1;
}

.related-prompt-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
  color: #64748b;
}

.content-task-submit {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 980px) {
  .analysis-content-task-form {
    grid-template-columns: 1fr;
  }
}
</style>

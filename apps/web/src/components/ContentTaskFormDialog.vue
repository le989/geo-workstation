<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { CreateContentTaskPayload } from "@/api/content";
import { getInstructionTemplates, type InstructionTemplate } from "@/api/instructions";
import { getKnowledgeBases, type KnowledgeBase } from "@/api/knowledge";
import GeoPromptSelector from "@/components/GeoPromptSelector.vue";
import { generationTypeOptions } from "@/config/content-options";
import { contentTypeLabelMap, instructionTypeLabelMap } from "@/config/instruction-options";
import { formatOptional } from "@/config/geo-prompt-options";

type ContentTaskFormState = {
  name: string;
  productLine: string;
  knowledgeBaseId: string;
  instructionTemplateId: string;
  generationType: string;
  targetModel: string;
  provider: string;
  model: string;
  geoPromptIds: string[];
  createdBy: string;
};

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateContentTaskPayload];
}>();

const form = reactive<ContentTaskFormState>({
  createdBy: "",
  generationType: "article",
  geoPromptIds: [],
  instructionTemplateId: "",
  knowledgeBaseId: "",
  model: "mock-content-v1",
  name: "",
  productLine: "",
  provider: "mock",
  targetModel: ""
});

const formError = ref("");
const selectError = ref("");
const loadingOptions = ref(false);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const instructionTemplates = ref<InstructionTemplate[]>([]);

const selectedKnowledgeBase = computed(() =>
  knowledgeBases.value.find((item) => item.id === form.knowledgeBaseId)
);
const selectedInstructionTemplate = computed(() =>
  instructionTemplates.value.find((item) => item.id === form.instructionTemplateId)
);

const getInstructionContentTypeLabel = (template: InstructionTemplate) =>
  contentTypeLabelMap[template.contentType] ?? template.contentType;

const resetForm = () => {
  form.createdBy = "";
  form.generationType = "article";
  form.geoPromptIds = [];
  form.instructionTemplateId = "";
  form.knowledgeBaseId = "";
  form.model = "mock-content-v1";
  form.name = "";
  form.productLine = "";
  form.provider = "mock";
  form.targetModel = "";
  formError.value = "";
  selectError.value = "";
};

const loadSelectOptions = async () => {
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
        ? `${error.message}。后端未连接时仍可查看页面结构。`
        : "知识库或指令模板加载失败。";
    knowledgeBases.value = [];
    instructionTemplates.value = [];
  } finally {
    loadingOptions.value = false;
  }
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
      void loadSelectOptions();
    }
  }
);

const close = () => {
  emit("update:modelValue", false);
};

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const handleSubmit = () => {
  formError.value = "";

  if (!form.name.trim()) {
    formError.value = "内容任务名称不能为空。";
    return;
  }

  if (!form.generationType.trim()) {
    formError.value = "生成类型不能为空。";
    return;
  }

  if (form.geoPromptIds.length === 0) {
    formError.value = "至少选择 1 个 GEO 提示词。";
    return;
  }

  emit("submit", {
    createdBy: trimOptional(form.createdBy),
    generationType: form.generationType.trim(),
    geoPromptIds: form.geoPromptIds,
    instructionTemplateId: trimOptional(form.instructionTemplateId),
    knowledgeBaseId: trimOptional(form.knowledgeBaseId),
    model: trimOptional(form.model) ?? "mock-content-v1",
    name: form.name.trim(),
    productLine: trimOptional(form.productLine),
    provider: trimOptional(form.provider) ?? "mock",
    targetModel: trimOptional(form.targetModel)
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="创建 GEO 内容生成任务"
    width="980px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      title="当前内容生成使用 Mock 生成器，不调用真实 DeepSeek / 豆包 / Kimi / 通义。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="formError || errorMessage || selectError"
      :title="formError || errorMessage || selectError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="content-task-form" label-position="top">
      <el-form-item label="任务名称" required>
        <el-input v-model="form.name" placeholder="例如：激光测距传感器 GEO 内容补齐任务" />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="例如：激光测距传感器" />
      </el-form-item>
      <el-form-item label="生成类型" required>
        <el-select v-model="form.generationType" filterable allow-create placeholder="选择生成类型">
          <el-option
            v-for="option in generationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标模型">
        <el-input v-model="form.targetModel" placeholder="例如 deepseek-chat / doubao" />
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
          内容类型：{{ getInstructionContentTypeLabel(selectedInstructionTemplate) }}
        </p>
      </el-form-item>
      <el-form-item label="Provider">
        <el-input v-model="form.provider" placeholder="mock" disabled />
      </el-form-item>
      <el-form-item label="Model">
        <el-input v-model="form.model" placeholder="mock-content-v1" disabled />
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
      <el-form-item label="选择 GEO 提示词" required class="form-span-2">
        <GeoPromptSelector v-model="form.geoPromptIds" :disabled="submitting" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        创建并 Mock 生成内容
      </el-button>
    </template>
  </el-dialog>
</template>

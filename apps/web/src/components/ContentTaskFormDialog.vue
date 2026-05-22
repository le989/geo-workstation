<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { CreateContentTaskPayload } from "@/api/content";
import { getInstructionTemplates, type InstructionTemplate } from "@/api/instructions";
import { getKnowledgeBases, type KnowledgeBase } from "@/api/knowledge";
import GeoPromptSelector from "@/components/GeoPromptSelector.vue";
import {
  contentModelOptions,
  formatContentModelName,
  generationTypeOptions
} from "@/config/content-options";
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
const advancedSections = ref<string[]>([]);
const selectError = ref("");
const loadingOptions = ref(false);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const instructionTemplates = ref<InstructionTemplate[]>([]);
const contentGenerationModeOptions = [
  { label: "基础生成模式", value: "mock" },
  { label: "AI 生成模式", value: "openai_compatible" }
];
const providerSafetyText = computed(() =>
  form.provider === "openai_compatible"
    ? "真实 AI 接口：会调用外部模型，可能产生额度消耗。"
    : "基础生成模式：不调用真实模型。"
);

const selectedKnowledgeBase = computed(() =>
  knowledgeBases.value.find((item) => item.id === form.knowledgeBaseId)
);
const selectedInstructionTemplate = computed(() =>
  instructionTemplates.value.find((item) => item.id === form.instructionTemplateId)
);
const activeStep = computed(() => {
  if (
    form.geoPromptIds.length > 0 &&
    form.name.trim() &&
    form.generationType.trim() &&
    form.provider
  ) {
    return 4;
  }

  if (form.knowledgeBaseId || form.instructionTemplateId) {
    return 3;
  }

  if (form.name.trim() && form.generationType.trim()) {
    return 2;
  }

  if (form.geoPromptIds.length > 0) {
    return 1;
  }

  return 0;
});

const getInstructionContentTypeLabel = (template: InstructionTemplate) =>
  contentTypeLabelMap[template.contentType] ?? template.contentType;

const resetForm = () => {
  advancedSections.value = [];
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

watch(
  () => form.provider,
  (provider) => {
    if (provider === "mock") {
      form.model = "mock-content-v1";
    } else if (!form.model || form.model === "mock-content-v1") {
      form.model = "deepseek-chat";
    }
  }
);

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
    generationType: form.generationType.trim(),
    geoPromptIds: form.geoPromptIds,
    instructionTemplateId: trimOptional(form.instructionTemplateId),
    knowledgeBaseId: trimOptional(form.knowledgeBaseId),
    model: trimOptional(form.model) ?? (form.provider === "mock" ? "mock-content-v1" : undefined),
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
      title="内容任务会结合提示词、知识库和指令模板生成可审校的 GEO 草稿，生成后仍需人工确认事实边界。"
      type="info"
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

    <el-steps class="content-create-steps" :active="activeStep" finish-status="success" simple>
      <el-step title="选择提示词" />
      <el-step title="任务信息" />
      <el-step title="知识与指令" />
      <el-step title="生成方式" />
      <el-step title="确认生成" />
    </el-steps>

    <el-form class="content-task-form" label-position="top">
      <section class="content-form-section content-form-section--prompts">
        <div class="content-form-section__header">
          <span>01</span>
          <div>
            <h3>选择要服务的 GEO 提示词</h3>
            <p>每个提示词会生成一个内容项，内容目标围绕 AI 问答中的品牌提及和推荐。</p>
          </div>
        </div>
        <el-form-item label="选择 GEO 提示词" required>
          <GeoPromptSelector v-model="form.geoPromptIds" :disabled="submitting" />
        </el-form-item>
      </section>

      <section class="content-form-section">
        <div class="content-form-section__header">
          <span>02</span>
          <div>
            <h3>填写任务基础信息</h3>
            <p>让任务名称、项目方向和生成类型清楚对应到 GEO 内容资产。</p>
          </div>
        </div>
        <div class="content-form-grid">
          <el-form-item label="任务名称" required>
            <el-input v-model="form.name" placeholder="例如：核心项目 GEO 内容补齐任务" />
          </el-form-item>
          <el-form-item label="产品线 / 服务线">
            <el-input
              v-model="form.productLine"
              placeholder="例如：核心产品、服务、课程或门店项目"
            />
          </el-form-item>
          <el-form-item label="生成类型" required>
            <el-select
              v-model="form.generationType"
              filterable
              allow-create
              placeholder="选择生成类型"
            >
              <el-option
                v-for="option in generationTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </div>
      </section>

      <section class="content-form-section">
        <div class="content-form-section__header">
          <span>03</span>
          <div>
            <h3>选择知识库与指令模板</h3>
            <p>知识库提供事实边界，指令模板控制内容结构和质量规则。</p>
          </div>
        </div>
        <div class="content-form-grid">
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
        </div>
      </section>

      <section class="content-form-section">
        <div class="content-form-section__header">
          <span>04</span>
          <div>
            <h3>高级配置</h3>
            <p>低频生成参数默认收起；如无特殊要求，按当前默认配置创建任务即可。</p>
          </div>
        </div>
        <el-collapse v-model="advancedSections" class="content-form-collapse">
          <el-collapse-item title="生成方式与模型参数" name="generation">
            <div class="content-form-grid">
              <el-form-item label="目标模型">
                <el-select
                  v-model="form.targetModel"
                  clearable
                  filterable
                  allow-create
                  placeholder="豆包 / 通义千问 / Kimi"
                >
                  <el-option
                    v-for="option in contentModelOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <p v-if="form.targetModel" class="form-help">
                  当前显示：{{ formatContentModelName(form.targetModel) }}
                </p>
              </el-form-item>
              <el-form-item label="生成方式">
                <el-select v-model="form.provider">
                  <el-option
                    v-for="option in contentGenerationModeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <p class="form-help">{{ providerSafetyText }}</p>
              </el-form-item>
              <el-form-item label="模型名称">
                <el-select
                  v-model="form.model"
                  filterable
                  allow-create
                  placeholder="豆包 / 通义千问 / Kimi"
                >
                  <el-option
                    v-for="option in contentModelOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <p v-if="form.model" class="form-help">
                  当前显示：{{ formatContentModelName(form.model) }}
                </p>
              </el-form-item>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        创建并生成内容
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type {
  CreateGeoPromptPayload,
  GeoPrompt,
  GeoPromptType,
  UpdateGeoPromptPayload,
  UserIntent
} from "@/api/geo-prompts";
import {
  coverageStatusOptions,
  geoPromptTypeOptions,
  splitCommaValues,
  userIntentOptions
} from "@/config/geo-prompt-options";

type GeoPromptFormState = {
  type: GeoPromptType;
  baseWord: string;
  promptText: string;
  productLine: string;
  scenario: string;
  userIntent: UserIntent;
  priority: number;
  targetModelsText: string;
  source: string;
  trackEnabled: boolean;
  latestCoverageStatus: string;
};

const props = defineProps<{
  modelValue: boolean;
  mode: "create" | "edit";
  prompt?: GeoPrompt | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateGeoPromptPayload | UpdateGeoPromptPayload];
}>();

const formError = ref("");

const form = reactive<GeoPromptFormState>({
  baseWord: "",
  latestCoverageStatus: "",
  priority: 3,
  productLine: "",
  promptText: "",
  scenario: "",
  source: "",
  targetModelsText: "",
  trackEnabled: false,
  type: "distilled",
  userIntent: "selection"
});

const resetForm = () => {
  form.baseWord = props.prompt?.baseWord ?? "";
  form.latestCoverageStatus = props.prompt?.latestCoverageStatus ?? "";
  form.priority = props.prompt?.priority ?? 3;
  form.productLine = props.prompt?.productLine ?? "";
  form.promptText = props.prompt?.promptText ?? "";
  form.scenario = props.prompt?.scenario ?? "";
  form.source = props.prompt?.source ?? "";
  form.targetModelsText = props.prompt?.targetModels?.join("，") ?? "";
  form.trackEnabled = props.prompt?.trackEnabled ?? false;
  form.type = props.prompt?.type ?? "distilled";
  form.userIntent = props.prompt?.userIntent ?? "selection";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.prompt],
  () => {
    if (props.modelValue) {
      resetForm();
    }
  },
  { immediate: true }
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

  if (!form.promptText.trim()) {
    formError.value = "GEO 提示词不能为空。";
    return;
  }

  if (form.priority < 1 || form.priority > 5) {
    formError.value = "优先级必须在 1-5 之间。";
    return;
  }

  emit("submit", {
    baseWord: trimOptional(form.baseWord),
    latestCoverageStatus: trimOptional(form.latestCoverageStatus),
    priority: form.priority,
    productLine: trimOptional(form.productLine),
    promptText: form.promptText.trim(),
    scenario: trimOptional(form.scenario),
    source: trimOptional(form.source),
    targetModels: splitCommaValues(form.targetModelsText),
    trackEnabled: form.trackEnabled,
    type: form.type,
    userIntent: form.userIntent
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? '新增 GEO 提示词' : '编辑 GEO 提示词'"
    width="720px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      v-if="formError || errorMessage"
      :title="formError || errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form label-position="top" class="geo-prompt-form">
      <el-form-item label="词类型" required>
        <el-select v-model="form.type">
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="用户意图" required>
        <el-select v-model="form.userIntent">
          <el-option
            v-for="option in userIntentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级" required>
        <el-input-number v-model="form.priority" :min="1" :max="5" />
      </el-form-item>
      <el-form-item label="是否追踪">
        <el-switch v-model="form.trackEnabled" active-text="追踪" inactive-text="不追踪" />
      </el-form-item>
      <el-form-item label="GEO 提示词" required class="form-span-2">
        <el-input
          v-model="form.promptText"
          type="textarea"
          :rows="3"
          placeholder="例如：某产品怎么选、某服务适合什么人、某门店适合什么场景"
        />
      </el-form-item>
      <el-form-item label="训练词">
        <el-input
          v-model="form.baseWord"
          placeholder="例如：核心产品词、服务词、课程词或门店场景"
        />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="例如：核心产品、服务、课程或门店项目" />
      </el-form-item>
      <el-form-item label="应用场景">
        <el-input v-model="form.scenario" placeholder="例如：行车防撞" />
      </el-form-item>
      <el-form-item label="来源">
        <el-input v-model="form.source" placeholder="例如：人工录入 / 批量导入 / GEO 分析" />
      </el-form-item>
      <el-form-item label="目标模型" class="form-span-2">
        <el-input
          v-model="form.targetModelsText"
          placeholder="多个模型用逗号分隔，例如 deepseek-chat, doubao"
        />
      </el-form-item>
      <el-form-item label="最新覆盖状态">
        <el-select v-model="form.latestCoverageStatus" clearable placeholder="未知">
          <el-option
            v-for="option in coverageStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ mode === "create" ? "创建提示词" : "保存修改" }}
      </el-button>
    </template>
  </el-dialog>
</template>

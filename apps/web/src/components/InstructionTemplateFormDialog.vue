<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { GeoPromptType } from "@/api/geo-prompts";
import type {
  CreateInstructionTemplatePayload,
  InstructionTemplate,
  UpdateInstructionTemplatePayload
} from "@/api/instructions";
import {
  contentTypeOptions,
  instructionTypeOptions,
  targetPromptTypeOptions
} from "@/config/instruction-options";

type InstructionTemplateFormState = {
  name: string;
  instructionType: string;
  contentType: string;
  targetPromptType: GeoPromptType | "";
  targetModel: string;
  instruction: string;
  outputFormat: string;
  qualityRules: string;
  forbiddenRules: string;
  createdBy: string;
};

const props = defineProps<{
  modelValue: boolean;
  mode: "create" | "edit";
  template?: InstructionTemplate | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateInstructionTemplatePayload | UpdateInstructionTemplatePayload];
}>();

const formError = ref("");

const form = reactive<InstructionTemplateFormState>({
  contentType: "article",
  createdBy: "",
  forbiddenRules: "",
  instruction: "",
  instructionType: "selection_guide",
  name: "",
  outputFormat: "",
  qualityRules: "",
  targetModel: "",
  targetPromptType: "distilled"
});

const resetForm = () => {
  form.contentType = props.template?.contentType ?? "article";
  form.createdBy = "";
  form.forbiddenRules = props.template?.forbiddenRules ?? "";
  form.instruction = props.template?.instruction ?? "";
  form.instructionType = props.template?.instructionType ?? "selection_guide";
  form.name = props.template?.name ?? "";
  form.outputFormat = props.template?.outputFormat ?? "";
  form.qualityRules = props.template?.qualityRules ?? "";
  form.targetModel = props.template?.targetModel ?? "";
  form.targetPromptType = props.template?.targetPromptType ?? "distilled";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.template],
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

  if (!form.name.trim()) {
    formError.value = "指令名称不能为空。";
    return;
  }

  if (!form.instructionType.trim()) {
    formError.value = "指令类型不能为空。";
    return;
  }

  if (!form.instruction.trim() || form.instruction.trim().length < 20) {
    formError.value = "指令正文至少需要 20 个字符。";
    return;
  }

  const payload: CreateInstructionTemplatePayload | UpdateInstructionTemplatePayload = {
    contentType: trimOptional(form.contentType),
    forbiddenRules: trimOptional(form.forbiddenRules),
    instruction: form.instruction.trim(),
    instructionType: form.instructionType.trim(),
    name: form.name.trim(),
    outputFormat: trimOptional(form.outputFormat),
    qualityRules: trimOptional(form.qualityRules),
    targetModel: trimOptional(form.targetModel),
    targetPromptType: form.targetPromptType || undefined
  };

  if (props.mode === "create") {
    (payload as CreateInstructionTemplatePayload).createdBy = trimOptional(form.createdBy);
  }

  emit("submit", payload);
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? '新建 GEO 指令模板' : '编辑 GEO 指令模板'"
    width="860px"
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

    <el-form class="instruction-template-form" label-position="top">
      <el-form-item label="指令名称" required>
        <el-input v-model="form.name" placeholder="例如：选型指南内容生成指令" />
      </el-form-item>
      <el-form-item label="指令类型" required>
        <el-select
          v-model="form.instructionType"
          filterable
          allow-create
          placeholder="选择或输入指令类型"
        >
          <el-option
            v-for="option in instructionTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="内容类型">
        <el-select
          v-model="form.contentType"
          clearable
          filterable
          allow-create
          placeholder="选择或输入内容类型"
        >
          <el-option
            v-for="option in contentTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="适用提示词类型">
        <el-select v-model="form.targetPromptType" clearable placeholder="选择提示词类型">
          <el-option
            v-for="option in targetPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="适用模型">
        <el-input v-model="form.targetModel" placeholder="例如 deepseek-chat / doubao" />
      </el-form-item>
      <el-form-item v-if="mode === 'create'" label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
      <el-form-item label="指令正文" required class="form-span-2">
        <el-input
          v-model="form.instruction"
          type="textarea"
          :rows="8"
          placeholder="说明如何指导 GEO 内容生成，至少 20 个字符。"
        />
      </el-form-item>
      <el-form-item label="输出格式" class="form-span-2">
        <el-input
          v-model="form.outputFormat"
          type="textarea"
          :rows="4"
          placeholder="例如：标题、用户问题、选型逻辑、问答式总结。"
        />
      </el-form-item>
      <el-form-item label="质量要求">
        <el-input
          v-model="form.qualityRules"
          type="textarea"
          :rows="4"
          placeholder="例如：必须包含品牌实体、产品参数、可被 AI 摘取的小结。"
        />
      </el-form-item>
      <el-form-item label="禁用规则">
        <el-input
          v-model="form.forbiddenRules"
          type="textarea"
          :rows="4"
          placeholder="例如：不要虚构资质、不要写无法验证的绝对化承诺。"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ mode === "create" ? "创建指令模板" : "保存修改" }}
      </el-button>
    </template>
  </el-dialog>
</template>

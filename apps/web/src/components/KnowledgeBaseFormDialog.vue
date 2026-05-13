<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type {
  CreateKnowledgeBasePayload,
  KnowledgeBase,
  UpdateKnowledgeBasePayload
} from "@/api/knowledge";
import { knowledgeBaseStatusOptions } from "@/config/knowledge-options";

type KnowledgeBaseFormState = {
  name: string;
  productLine: string;
  description: string;
  status: string;
};

const props = defineProps<{
  modelValue: boolean;
  mode: "create" | "edit";
  knowledgeBase?: KnowledgeBase | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateKnowledgeBasePayload | UpdateKnowledgeBasePayload];
}>();

const formError = ref("");

const form = reactive<KnowledgeBaseFormState>({
  description: "",
  name: "",
  productLine: "",
  status: "active"
});

const resetForm = () => {
  form.description = props.knowledgeBase?.description ?? "";
  form.name = props.knowledgeBase?.name ?? "";
  form.productLine = props.knowledgeBase?.productLine ?? "";
  form.status = props.knowledgeBase?.status ?? "active";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.knowledgeBase],
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
    formError.value = "知识库名称不能为空。";
    return;
  }

  emit("submit", {
    description: trimOptional(form.description),
    name: form.name.trim(),
    productLine: trimOptional(form.productLine),
    status: form.status || "active"
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? '新建企业 GEO 知识库' : '编辑企业 GEO 知识库'"
    width="640px"
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

    <el-form class="knowledge-base-form" label-position="top">
      <el-form-item label="知识库名称" required>
        <el-input v-model="form.name" placeholder="例如：激光测距传感器知识库" />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="例如：工业传感器" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status">
          <el-option
            v-for="option in knowledgeBaseStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="知识库说明" class="form-span-2">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="说明这批企业事实资料会支撑哪些 GEO 内容、AI 问答或选型场景。"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ mode === "create" ? "创建知识库" : "保存修改" }}
      </el-button>
    </template>
  </el-dialog>
</template>

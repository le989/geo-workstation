<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { KnowledgeChunk, UpdateKnowledgeChunkPayload } from "@/api/knowledge";
import { splitCommaValues } from "@/config/geo-prompt-options";
import { materialTypeOptions, sourceTypeOptions } from "@/config/knowledge-options";

const props = defineProps<{
  modelValue: boolean;
  chunk?: KnowledgeChunk | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: UpdateKnowledgeChunkPayload];
}>();

const formError = ref("");

const form = reactive({
  content: "",
  materialType: "",
  productLine: "",
  sourceType: "pasted_text",
  tagsText: "",
  title: ""
});

const resetForm = () => {
  form.content = props.chunk?.content ?? "";
  form.materialType = props.chunk?.materialType ?? "";
  form.productLine = props.chunk?.productLine ?? "";
  form.sourceType = props.chunk?.sourceType ?? "pasted_text";
  form.tagsText = props.chunk?.tags?.join("，") ?? "";
  form.title = props.chunk?.title ?? "";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.chunk],
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

  if (!form.title.trim()) {
    formError.value = "知识片段标题不能为空。";
    return;
  }

  if (!form.content.trim() || form.content.trim().length < 10) {
    formError.value = "知识片段正文至少需要 10 个字符。";
    return;
  }

  emit("submit", {
    content: form.content.trim(),
    materialType: trimOptional(form.materialType),
    productLine: trimOptional(form.productLine),
    sourceType: trimOptional(form.sourceType),
    tags: splitCommaValues(form.tagsText),
    title: form.title.trim()
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑知识片段"
    width="760px"
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

    <el-form class="knowledge-chunk-form" label-position="top">
      <el-form-item label="片段标题" required>
        <el-input v-model="form.title" placeholder="知识片段标题" />
      </el-form-item>
      <el-form-item label="来源类型">
        <el-select v-model="form.sourceType">
          <el-option
            v-for="option in sourceTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资料类型">
        <el-select v-model="form.materialType" clearable placeholder="选择资料类型">
          <el-option
            v-for="option in materialTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="产品线" />
      </el-form-item>
      <el-form-item label="标签" class="form-span-2">
        <el-input v-model="form.tagsText" placeholder="多个标签用逗号分隔" />
      </el-form-item>
      <el-form-item label="正文内容" required class="form-span-2">
        <el-input v-model="form.content" type="textarea" :rows="8" placeholder="至少 10 个字符" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存知识片段
      </el-button>
    </template>
  </el-dialog>
</template>

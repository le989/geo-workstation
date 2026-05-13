<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { DuplicateInstructionTemplatePayload, InstructionTemplate } from "@/api/instructions";

const props = defineProps<{
  modelValue: boolean;
  template?: InstructionTemplate | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: DuplicateInstructionTemplatePayload];
}>();

const formError = ref("");

const form = reactive({
  createdBy: "",
  name: ""
});

watch(
  () => [props.modelValue, props.template],
  () => {
    if (props.modelValue) {
      form.createdBy = "";
      form.name = "";
      formError.value = "";
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
  emit("submit", {
    createdBy: trimOptional(form.createdBy),
    name: trimOptional(form.name)
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="复制 GEO 指令模板"
    width="560px"
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

    <div class="instruction-duplicate-copy">
      <p class="section-kicker">复制指令</p>
      <h3>{{ template?.name ?? "待复制指令模板" }}</h3>
      <p>不输入新名称时使用后端默认规则；如果名称重复，后端会自动追加序号。</p>
    </div>

    <el-form label-position="top" class="instruction-duplicate-form">
      <el-form-item label="新名称">
        <el-input v-model="form.name" placeholder="可选：留空使用“原名称 副本”" />
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        复制指令模板
      </el-button>
    </template>
  </el-dialog>
</template>

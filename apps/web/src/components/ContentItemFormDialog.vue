<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { ContentItem, UpdateContentItemPayload } from "@/api/content";
import { contentItemStatusOptions, splitLinesToArray } from "@/config/content-options";

type ContentItemFormState = {
  title: string;
  body: string;
  geoOptimizationPointsText: string;
  suggestedPublishChannel: string;
  status: string;
};

const props = defineProps<{
  modelValue: boolean;
  mode: "view" | "edit";
  item?: ContentItem | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: UpdateContentItemPayload];
}>();

const formError = ref("");
const form = reactive<ContentItemFormState>({
  body: "",
  geoOptimizationPointsText: "",
  status: "draft",
  suggestedPublishChannel: "",
  title: ""
});

const resetForm = () => {
  form.body = props.item?.body ?? "";
  form.geoOptimizationPointsText = props.item?.geoOptimizationPoints?.join("\n") ?? "";
  form.status = props.item?.status ?? "draft";
  form.suggestedPublishChannel = props.item?.suggestedPublishChannel ?? "";
  form.title = props.item?.title ?? "";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.item],
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
    formError.value = "内容项标题不能为空。";
    return;
  }

  if (!form.body.trim() || form.body.trim().length < 20) {
    formError.value = "内容正文至少需要 20 个字符。";
    return;
  }

  emit("submit", {
    body: form.body.trim(),
    geoOptimizationPoints: splitLinesToArray(form.geoOptimizationPointsText),
    status: trimOptional(form.status),
    suggestedPublishChannel: trimOptional(form.suggestedPublishChannel),
    title: form.title.trim()
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'view' ? '查看 GEO 内容项' : '编辑 GEO 内容项'"
    width="920px"
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

    <el-form class="content-item-form" label-position="top">
      <el-form-item label="标题" required>
        <el-input v-model="form.title" :disabled="mode === 'view'" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" :disabled="mode === 'view'" filterable allow-create>
          <el-option
            v-for="option in contentItemStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="建议发布位置">
        <el-input
          v-model="form.suggestedPublishChannel"
          :disabled="mode === 'view'"
          placeholder="例如 官网产品页 / FAQ / 销售资料"
        />
      </el-form-item>
      <el-form-item label="GEO 优化点" class="form-span-2">
        <el-input
          v-model="form.geoOptimizationPointsText"
          :disabled="mode === 'view'"
          type="textarea"
          :rows="5"
          placeholder="每行一个优化点，例如：强化品牌实体、补充参数、增加问答式总结"
        />
      </el-form-item>
      <el-form-item label="内容正文" required class="form-span-2">
        <el-input
          v-model="form.body"
          :disabled="mode === 'view'"
          type="textarea"
          :rows="14"
          placeholder="正文至少 20 个字符。第一版不做复杂富文本编辑器。"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">{{ mode === "view" ? "关闭" : "取消" }}</el-button>
      <el-button v-if="mode === 'edit'" type="primary" :loading="submitting" @click="handleSubmit">
        保存内容项
      </el-button>
    </template>
  </el-dialog>
</template>

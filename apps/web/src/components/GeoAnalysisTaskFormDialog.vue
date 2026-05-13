<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type {
  CreateGeoAnalysisTaskPayload,
  GeoAnalysisTask,
  UpdateGeoAnalysisTaskPayload
} from "@/api/geo-analysis";
import { defaultTargetModels } from "@/config/geo-analysis-options";
import { splitCommaValues } from "@/config/geo-prompt-options";

type FormState = {
  name: string;
  brandName: string;
  websiteUrl: string;
  productLine: string;
  baseWordsText: string;
  targetModelsText: string;
  createdBy: string;
};

const props = defineProps<{
  modelValue: boolean;
  mode: "create" | "edit";
  task?: GeoAnalysisTask | null;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateGeoAnalysisTaskPayload | UpdateGeoAnalysisTaskPayload];
}>();

const form = reactive<FormState>({
  baseWordsText: "",
  brandName: "",
  createdBy: "",
  name: "",
  productLine: "",
  targetModelsText: defaultTargetModels.join("，"),
  websiteUrl: ""
});

const localError = computed(() => {
  if (!form.name.trim()) {
    return "分析任务名称不能为空。";
  }
  if (!form.brandName.trim()) {
    return "品牌名称不能为空。";
  }
  if (splitCommaValues(form.targetModelsText).length === 0) {
    return "至少填写 1 个目标模型。";
  }
  return "";
});

const title = computed(() => (props.mode === "create" ? "新建 GEO 分析任务" : "编辑 GEO 分析任务"));

const resetForm = () => {
  form.baseWordsText = "";
  form.brandName = "";
  form.createdBy = "";
  form.name = "";
  form.productLine = "";
  form.targetModelsText = defaultTargetModels.join("，");
  form.websiteUrl = "";
};

const fillTask = (task: GeoAnalysisTask) => {
  form.baseWordsText = "";
  form.brandName = task.brandName ?? "";
  form.createdBy = task.createdBy ?? "";
  form.name = task.name ?? "";
  form.productLine = task.productLine ?? "";
  form.targetModelsText = task.targetModels.join("，");
  form.websiteUrl = task.websiteUrl ?? "";
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      return;
    }
    if (props.mode === "edit" && props.task) {
      fillTask(props.task);
      return;
    }
    resetForm();
  }
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const handleSubmit = () => {
  if (localError.value) {
    return;
  }

  const payload: CreateGeoAnalysisTaskPayload | UpdateGeoAnalysisTaskPayload = {
    brandName: form.brandName.trim(),
    name: form.name.trim(),
    productLine: trimOptional(form.productLine),
    targetModels: splitCommaValues(form.targetModelsText),
    websiteUrl: trimOptional(form.websiteUrl)
  };

  if (props.mode === "create") {
    payload.baseWords = splitCommaValues(form.baseWordsText);
    payload.createdBy = trimOptional(form.createdBy);
  }

  emit("submit", payload);
};

const close = () => {
  emit("update:modelValue", false);
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="760px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      title="当前阶段为模拟 GEO 分析，不调用真实外部 AI 平台，也不访问真实网站。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="analysis-task-form" label-position="top">
      <el-form-item label="任务名称" required>
        <el-input v-model="form.name" placeholder="例如：凯基特激光测距传感器 GEO 诊断" />
      </el-form-item>
      <el-form-item label="品牌名称" required>
        <el-input v-model="form.brandName" placeholder="例如：凯基特" />
      </el-form-item>
      <el-form-item label="官网">
        <el-input v-model="form.websiteUrl" placeholder="例如：https://example.com" />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="例如：激光测距传感器" />
      </el-form-item>
      <el-form-item v-if="mode === 'create'" label="核心训练词">
        <el-input
          v-model="form.baseWordsText"
          type="textarea"
          :rows="3"
          placeholder="逗号或换行分隔，例如：激光测距传感器，行车防撞传感器"
        />
      </el-form-item>
      <el-form-item label="目标模型" required>
        <el-input
          v-model="form.targetModelsText"
          type="textarea"
          :rows="3"
          placeholder="逗号或换行分隔，例如：deepseek-chat，doubao，kimi"
        />
      </el-form-item>
      <el-form-item v-if="mode === 'create'" label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
    </el-form>

    <el-alert
      v-if="localError"
      :title="localError"
      type="info"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="Boolean(localError)"
        @click="handleSubmit"
      >
        {{ mode === "create" ? "创建分析任务" : "保存修改" }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.analysis-task-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.analysis-task-form :deep(.el-form-item:nth-child(5)),
.analysis-task-form :deep(.el-form-item:nth-child(6)) {
  grid-column: 1 / -1;
}

@media (max-width: 760px) {
  .analysis-task-form {
    grid-template-columns: 1fr;
  }
}
</style>

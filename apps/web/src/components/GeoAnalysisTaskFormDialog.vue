<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type {
  CreateGeoAnalysisTaskPayload,
  GeoAnalysisTask,
  UpdateGeoAnalysisTaskPayload
} from "@/api/geo-analysis";
import {
  defaultTargetModels,
  formatTargetModelName,
  targetModelOptions
} from "@/config/geo-analysis-options";
import { splitCommaValues } from "@/config/geo-prompt-options";

type FormState = {
  name: string;
  brandName: string;
  websiteUrl: string;
  productLine: string;
  baseWordsText: string;
  targetModels: string[];
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
  name: "",
  productLine: "",
  targetModels: [...defaultTargetModels],
  websiteUrl: ""
});

const localError = computed(() => {
  if (!form.name.trim()) {
    return "诊断任务名称不能为空。";
  }
  if (!form.brandName.trim()) {
    return "品牌名称不能为空。";
  }
  if (form.targetModels.length === 0) {
    return "至少选择 1 个目标模型。";
  }
  return "";
});

const title = computed(() => (props.mode === "create" ? "新建 GEO 诊断任务" : "编辑 GEO 诊断任务"));
const targetModelSelectOptions = computed(() => {
  const knownValues = new Set(targetModelOptions.map((item) => item.value));
  const extraOptions = form.targetModels
    .filter((value) => !knownValues.has(value))
    .map((value) => ({ label: formatTargetModelName(value), value }));

  return [...targetModelOptions, ...extraOptions];
});

const resetForm = () => {
  form.baseWordsText = "";
  form.brandName = "";
  form.name = "";
  form.productLine = "";
  form.targetModels = [...defaultTargetModels];
  form.websiteUrl = "";
};

const fillTask = (task: GeoAnalysisTask) => {
  form.baseWordsText = "";
  form.brandName = task.brandName ?? "";
  form.name = task.name ?? "";
  form.productLine = task.productLine ?? "";
  form.targetModels = [...task.targetModels];
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
    targetModels: form.targetModels,
    websiteUrl: trimOptional(form.websiteUrl)
  };

  if (props.mode === "create") {
    payload.baseWords = splitCommaValues(form.baseWordsText);
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
      title="诊断结果用于辅助判断品牌覆盖、官网引用与竞品占位情况。"
      type="info"
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
      <section class="analysis-form-section">
        <div class="analysis-form-section__header">
          <span>1</span>
          <div>
            <h3>诊断对象</h3>
            <p>明确品牌、官网和项目方向，后续分析结果会围绕这些信息生成。</p>
          </div>
        </div>
        <div class="analysis-form-grid">
          <el-form-item label="任务名称" required>
            <el-input v-model="form.name" placeholder="例如：核心项目 GEO 诊断" />
          </el-form-item>
          <el-form-item label="品牌名称" required>
            <el-input v-model="form.brandName" placeholder="例如：品牌名称" />
          </el-form-item>
          <el-form-item label="官网">
            <el-input v-model="form.websiteUrl" placeholder="例如：https://example.com" />
          </el-form-item>
          <el-form-item label="产品线 / 服务线">
            <el-input
              v-model="form.productLine"
              placeholder="例如：核心产品、服务、课程或门店项目"
            />
          </el-form-item>
        </div>
      </section>

      <section class="analysis-form-section">
        <div class="analysis-form-section__header">
          <span>2</span>
          <div>
            <h3>分析输入</h3>
            <p>核心训练词用于组织用户问题簇，目标模型用于记录本次诊断关注的模型范围。</p>
          </div>
        </div>
        <div class="analysis-form-grid">
          <el-form-item v-if="mode === 'create'" label="核心训练词">
            <el-input
              v-model="form.baseWordsText"
              type="textarea"
              :rows="3"
              placeholder="逗号或换行分隔，例如：核心产品词，典型服务场景，品牌词"
            />
          </el-form-item>
          <el-form-item label="目标模型" required>
            <el-select
              v-model="form.targetModels"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="选择本次诊断关注的模型"
            >
              <el-option
                v-for="option in targetModelSelectOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </div>
      </section>
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
        {{ mode === "create" ? "创建诊断任务" : "保存修改" }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.analysis-task-form {
  display: grid;
  gap: 16px;
}

.analysis-form-section {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #fbfdff;
}

.analysis-form-section__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.analysis-form-section__header > span {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--geo-accent-soft);
  color: var(--geo-accent);
  font-weight: 800;
}

.analysis-form-section__header h3 {
  margin: 0 0 4px;
  color: #13243a;
  font-size: 16px;
}

.analysis-form-section__header p {
  margin: 0;
  color: var(--geo-muted);
  line-height: 1.6;
}

.analysis-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.analysis-form-grid :deep(.el-form-item) {
  margin-bottom: 0;
}

.analysis-form-grid :deep(.el-form-item:has(.el-textarea)) {
  grid-column: 1 / -1;
}

@media (max-width: 760px) {
  .analysis-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

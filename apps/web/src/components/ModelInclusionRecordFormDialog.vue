<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { getGeoPrompts, type GeoPrompt } from "@/api/geo-prompts";
import type { CreateModelInclusionRecordPayload } from "@/api/model-inclusion";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import { formatOptional, splitCommaValues, userIntentLabelMap } from "@/config/geo-prompt-options";

type ModelInclusionRecordFormState = {
  answerSummary: string;
  brandMentioned: boolean;
  brandRecommended: boolean;
  checkedAt: string;
  citedOfficialSite: boolean;
  competitorsText: string;
  createdBy: string;
  geoPromptId: string;
  model: string;
  rankingPosition: number | undefined;
  recordMethod: "manual";
};

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateModelInclusionRecordPayload];
}>();

const form = reactive<ModelInclusionRecordFormState>({
  answerSummary: "",
  brandMentioned: false,
  brandRecommended: false,
  checkedAt: "",
  citedOfficialSite: false,
  competitorsText: "",
  createdBy: "",
  geoPromptId: "",
  model: "",
  rankingPosition: undefined,
  recordMethod: "manual"
});

const prompts = ref<GeoPrompt[]>([]);
const promptSearch = ref("");
const promptsLoading = ref(false);
const formError = ref("");
const promptError = ref("");

const resetForm = () => {
  form.answerSummary = "";
  form.brandMentioned = false;
  form.brandRecommended = false;
  form.checkedAt = new Date().toISOString();
  form.citedOfficialSite = false;
  form.competitorsText = "";
  form.createdBy = "";
  form.geoPromptId = "";
  form.model = "";
  form.rankingPosition = undefined;
  form.recordMethod = "manual";
  formError.value = "";
  promptError.value = "";
};

const loadPrompts = async () => {
  promptsLoading.value = true;
  promptError.value = "";

  try {
    const result = await getGeoPrompts({
      page: 1,
      pageSize: 50,
      search: promptSearch.value.trim() || undefined
    });
    prompts.value = result.items;
  } catch (error) {
    promptError.value =
      error instanceof Error ? `${error.message}。可稍后重试提示词搜索。` : "GEO 提示词加载失败。";
    prompts.value = [];
  } finally {
    promptsLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
      void loadPrompts();
    }
  }
);

onMounted(() => {
  void loadPrompts();
});

const close = () => {
  emit("update:modelValue", false);
};

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const getPromptLabel = (prompt: GeoPrompt) =>
  `${prompt.promptText} / ${formatOptional(prompt.productLine)} / ${
    userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent
  }`;

const handleSubmit = () => {
  formError.value = "";

  if (!form.geoPromptId) {
    formError.value = "必须选择一个 GEO 提示词。";
    return;
  }

  if (!form.model.trim()) {
    formError.value = "AI 模型不能为空。";
    return;
  }

  if (
    form.rankingPosition !== undefined &&
    (!Number.isInteger(form.rankingPosition) || form.rankingPosition <= 0)
  ) {
    formError.value = "推荐位置必须是正整数。";
    return;
  }

  emit("submit", {
    answerSummary: trimOptional(form.answerSummary),
    brandMentioned: form.brandMentioned,
    brandRecommended: form.brandRecommended,
    checkedAt: trimOptional(form.checkedAt),
    citedOfficialSite: form.citedOfficialSite,
    competitors: splitCommaValues(form.competitorsText),
    createdBy: trimOptional(form.createdBy),
    geoPromptId: form.geoPromptId,
    model: form.model.trim(),
    rankingPosition: form.rankingPosition,
    recordMethod: "manual"
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="手动新增模型覆盖记录"
    width="920px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      title="第一版为人工录入 / 导入覆盖记录，不做自动检测外部 AI 平台。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="formError || errorMessage || promptError"
      :title="formError || errorMessage || promptError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="model-record-form" label-position="top">
      <el-form-item label="GEO 提示词" required class="form-span-2">
        <div class="model-prompt-picker">
          <div class="model-prompt-picker__search">
            <el-input
              v-model="promptSearch"
              clearable
              placeholder="搜索提示词、训练词、应用场景或来源"
              @keyup.enter="loadPrompts"
            />
            <el-button :loading="promptsLoading" @click="loadPrompts">搜索提示词</el-button>
          </div>
          <el-select
            v-model="form.geoPromptId"
            filterable
            :loading="promptsLoading"
            placeholder="选择被检测的 GEO 提示词"
          >
            <el-option
              v-for="prompt in prompts"
              :key="prompt.id"
              :label="getPromptLabel(prompt)"
              :value="prompt.id"
            >
              <div class="model-prompt-option">
                <span>{{ prompt.promptText }}</span>
                <GeoPromptTypeTag :type="prompt.type" />
                <small>{{ formatOptional(prompt.productLine) }}</small>
              </div>
            </el-option>
          </el-select>
        </div>
      </el-form-item>
      <el-form-item label="AI 模型" required>
        <el-input v-model="form.model" placeholder="例如 deepseek / kimi / doubao" />
      </el-form-item>
      <el-form-item label="查询时间">
        <el-date-picker
          v-model="form.checkedAt"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          placeholder="默认当前时间"
        />
      </el-form-item>
      <el-form-item label="是否提及品牌">
        <el-switch v-model="form.brandMentioned" active-text="已提及" inactive-text="未提及" />
      </el-form-item>
      <el-form-item label="是否推荐品牌">
        <el-switch v-model="form.brandRecommended" active-text="已推荐" inactive-text="未推荐" />
      </el-form-item>
      <el-form-item label="推荐位置">
        <el-input-number v-model="form.rankingPosition" :min="1" :precision="0" clearable />
      </el-form-item>
      <el-form-item label="是否引用官网">
        <el-switch
          v-model="form.citedOfficialSite"
          active-text="已引用官网"
          inactive-text="未引用官网"
        />
      </el-form-item>
      <el-form-item label="竞品提及">
        <el-input v-model="form.competitorsText" placeholder="逗号分隔，例如 竞品A, 竞品B" />
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="form.createdBy" placeholder="可选：用户 ID" />
      </el-form-item>
      <el-form-item label="回答摘要" class="form-span-2">
        <el-input
          v-model="form.answerSummary"
          type="textarea"
          :rows="5"
          placeholder="记录 AI 回答是否提到品牌、是否推荐、引用了哪些资料，以及哪些缺口需要补内容。"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存覆盖记录
      </el-button>
    </template>
  </el-dialog>
</template>

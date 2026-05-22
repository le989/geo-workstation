<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type {
  GeoHitLevel,
  ModelInclusionRecord,
  UpdateModelInclusionRecordPayload
} from "@/api/model-inclusion";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  detectionMethodLabelMap,
  entryPointLabelMap,
  formatDisplayLabel,
  hitLevelOptions,
  recordMethodLabelMap
} from "@/config/model-inclusion-options";

const props = defineProps<{
  modelValue: boolean;
  record?: ModelInclusionRecord | null;
  submitting?: boolean;
  errorMessage?: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: UpdateModelInclusionRecordPayload];
}>();

const form = reactive({
  checkedAt: "",
  brandMentioned: false,
  brandRecommended: false,
  rankingPosition: undefined as number | undefined,
  citedOfficialSite: false,
  citedContentAsset: false,
  competitorMentioned: false,
  hitLevel: undefined as GeoHitLevel | undefined,
  answerSummary: "",
  rawAnswer: "",
  citationsText: "",
  searchResultsText: "",
  screenshotPath: "",
  errorMessage: "",
  competitorsText: ""
});
const formError = ref("");

const formatEntryPoint = (value?: string) =>
  value ? (entryPointLabelMap[value as keyof typeof entryPointLabelMap] ?? value) : "--";

const formatDetectionMethod = (value?: string) =>
  value ? (detectionMethodLabelMap[value as keyof typeof detectionMethodLabelMap] ?? value) : "--";

const formatRecordMethod = (value?: string) =>
  value ? (recordMethodLabelMap[value as keyof typeof recordMethodLabelMap] ?? value) : "--";

const stringifyJson = (value: unknown) => {
  if (!value) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

const resetForm = () => {
  const record = props.record;

  form.checkedAt = record?.checkedAt ?? "";
  form.brandMentioned = record?.brandMentioned ?? false;
  form.brandRecommended = record?.brandRecommended ?? false;
  form.rankingPosition = record?.rankingPosition ?? undefined;
  form.citedOfficialSite = record?.citedOfficialSite ?? false;
  form.citedContentAsset = record?.citedContentAsset ?? false;
  form.competitorMentioned = record?.competitorMentioned ?? false;
  form.hitLevel = record?.hitLevel as GeoHitLevel | undefined;
  form.answerSummary = record?.answerSummary ?? "";
  form.rawAnswer = record?.rawAnswer ?? "";
  form.citationsText = stringifyJson(record?.citations);
  form.searchResultsText = stringifyJson(record?.searchResults);
  form.screenshotPath = record?.screenshotPath ?? "";
  form.errorMessage = record?.errorMessage ?? "";
  form.competitorsText = record?.competitors?.join("、") ?? "";
  formError.value = "";
};

watch(
  () => [props.modelValue, props.record?.id],
  () => {
    if (props.modelValue) {
      resetForm();
    }
  },
  {
    immediate: true
  }
);

const parseOptionalJson = (value: string, label: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} 必须是合法 JSON`);
  }
};

const buildPayload = (): UpdateModelInclusionRecordPayload => ({
  checkedAt: form.checkedAt || undefined,
  brandMentioned: form.brandMentioned,
  brandRecommended: form.brandRecommended,
  rankingPosition: form.rankingPosition ?? null,
  citedOfficialSite: form.citedOfficialSite,
  citedContentAsset: form.citedContentAsset,
  competitorMentioned: form.competitorMentioned,
  hitLevel: form.hitLevel,
  answerSummary: form.answerSummary.trim(),
  rawAnswer: form.rawAnswer.trim(),
  citations: parseOptionalJson(form.citationsText, "引用链接"),
  searchResults: parseOptionalJson(form.searchResultsText, "搜索结果"),
  screenshotPath: form.screenshotPath.trim(),
  errorMessage: form.errorMessage.trim(),
  competitors: form.competitorsText
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
});

const close = () => {
  emit("update:modelValue", false);
};

const handleSubmit = () => {
  if (props.readonly) {
    close();
    return;
  }

  try {
    formError.value = "";
    emit("submit", buildPayload());
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "请检查表单内容。";
  }
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="readonly ? '查看模型覆盖记录' : '编辑模型覆盖记录'"
    width="960px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      v-if="readonly"
      title="已作废记录仅供查看，如需再次纳入统计，请先恢复。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="formError || errorMessage"
      :title="formError || errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <div v-if="record" class="model-record-edit">
      <section>
        <div class="model-record-edit__header">
          <p class="section-kicker">基础信息，只读</p>
          <h3>{{ formatDisplayLabel(record.geoPrompt.promptText) }}</h3>
        </div>
        <div class="model-record-edit__grid">
          <span>公司 / 产品线</span>
          <strong>当前公司 / {{ formatOptional(record.geoPrompt.productLine) }}</strong>
          <span>提示词 / 问题</span>
          <strong>{{ record.geoPrompt.promptText }}</strong>
          <span>模型</span>
          <strong>{{ record.model }}</strong>
          <span>平台</span>
          <strong>{{ formatOptional(record.platform) }}</strong>
          <span>来源 / 检测方式</span>
          <strong>
            {{ formatRecordMethod(record.recordMethod) }} /
            {{ formatEntryPoint(record.entryPoint) }} /
            {{ formatDetectionMethod(record.detectionMethod) }}
          </strong>
          <span>创建时间</span>
          <strong>{{ formatDateTime(record.createdAt) }}</strong>
        </div>
      </section>

      <section>
        <div class="model-record-edit__header">
          <p class="section-kicker">结果信息，可编辑</p>
          <h3>品牌出现、引用与回答证据</h3>
        </div>
        <el-form class="model-record-edit__form" label-position="top">
          <el-form-item label="检测时间">
            <el-date-picker
              v-model="form.checkedAt"
              :disabled="readonly"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
              placeholder="选择检测时间"
            />
          </el-form-item>
          <el-form-item label="品牌是否出现">
            <el-switch v-model="form.brandMentioned" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="品牌是否推荐">
            <el-switch v-model="form.brandRecommended" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="排名位置">
            <el-input-number
              v-model="form.rankingPosition"
              :disabled="readonly"
              :min="1"
              :precision="0"
              clearable
            />
          </el-form-item>
          <el-form-item label="是否引用官网">
            <el-switch v-model="form.citedOfficialSite" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="是否引用内容资产">
            <el-switch v-model="form.citedContentAsset" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="是否提及竞品">
            <el-switch v-model="form.competitorMentioned" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="命中等级">
            <el-select v-model="form.hitLevel" :disabled="readonly" clearable placeholder="命中等级">
              <el-option
                v-for="option in hitLevelOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="竞品">
            <el-input
              v-model="form.competitorsText"
              :disabled="readonly"
              placeholder="多个竞品用顿号或逗号分隔"
            />
          </el-form-item>
          <el-form-item label="截图路径">
            <el-input v-model="form.screenshotPath" :disabled="readonly" />
          </el-form-item>
          <el-form-item label="回答摘要" class="form-span-2">
            <el-input v-model="form.answerSummary" :disabled="readonly" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="原始回答" class="form-span-2">
            <el-input v-model="form.rawAnswer" :disabled="readonly" type="textarea" :rows="5" />
          </el-form-item>
          <el-form-item label="引用链接 JSON" class="form-span-2">
            <el-input v-model="form.citationsText" :disabled="readonly" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="搜索结果 JSON" class="form-span-2">
            <el-input
              v-model="form.searchResultsText"
              :disabled="readonly"
              type="textarea"
              :rows="4"
            />
          </el-form-item>
          <el-form-item label="错误信息" class="form-span-2">
            <el-input v-model="form.errorMessage" :disabled="readonly" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
      </section>
    </div>

    <template #footer>
      <el-button @click="close">{{ readonly ? "关闭" : "取消" }}</el-button>
      <el-button v-if="!readonly" type="primary" :loading="submitting" @click="handleSubmit">
        保存结果字段
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.model-record-edit {
  display: grid;
  gap: 18px;
}

.model-record-edit section {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
}

.model-record-edit__header {
  margin-bottom: 12px;
}

.model-record-edit__header h3 {
  margin: 4px 0 0;
  font-size: 16px;
}

.model-record-edit__grid {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 10px 14px;
}

.model-record-edit__grid span {
  color: var(--el-text-color-secondary);
}

.model-record-edit__grid strong {
  min-width: 0;
  word-break: break-word;
}

.model-record-edit__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.form-span-2 {
  grid-column: span 2;
}
</style>

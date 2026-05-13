<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type {
  BulkImportGeoPromptsPayload,
  BulkImportGeoPromptsResult,
  GeoPromptType,
  UserIntent
} from "@/api/geo-prompts";
import { geoPromptTypeOptions, userIntentOptions } from "@/config/geo-prompt-options";

const duplicateReasonLabelMap: Record<string, string> = {
  duplicate_in_batch: "本批重复",
  duplicate_in_database: "策略库已存在"
};

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  result?: BulkImportGeoPromptsResult | null;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: BulkImportGeoPromptsPayload];
}>();

const form = reactive({
  priority: 3,
  productLine: "",
  promptTexts: "",
  trackEnabled: false,
  type: "distilled" as GeoPromptType,
  userIntent: "selection" as UserIntent
});

const localError = ref("");

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      localError.value = "";
    }
  }
);

const close = () => {
  emit("update:modelValue", false);
};

const handleSubmit = () => {
  localError.value = "";
  const promptTexts = form.promptTexts
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (promptTexts.length === 0) {
    localError.value = "请至少粘贴一行 GEO 提示词。";
    return;
  }

  emit("submit", {
    rows: promptTexts.map((promptText) => ({
      priority: form.priority,
      productLine: form.productLine.trim() || undefined,
      promptText,
      trackEnabled: form.trackEnabled,
      type: form.type,
      userIntent: form.userIntent
    }))
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="批量导入 GEO 提示词"
    width="760px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      v-if="localError || errorMessage"
      :title="localError || errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form label-position="top" class="geo-prompt-import-form">
      <el-form-item label="默认词类型">
        <el-select v-model="form.type">
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="默认用户意图">
        <el-select v-model="form.userIntent">
          <el-option
            v-for="option in userIntentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="默认优先级">
        <el-input-number v-model="form.priority" :min="1" :max="5" />
      </el-form-item>
      <el-form-item label="默认追踪">
        <el-switch v-model="form.trackEnabled" active-text="追踪" inactive-text="不追踪" />
      </el-form-item>
      <el-form-item label="默认产品线" class="form-span-2">
        <el-input v-model="form.productLine" placeholder="可选，例如 工业传感器" />
      </el-form-item>
      <el-form-item label="多行 GEO 提示词" class="form-span-2">
        <el-input
          v-model="form.promptTexts"
          type="textarea"
          :rows="8"
          placeholder="每行一个 GEO 提示词，空行会自动忽略"
        />
      </el-form-item>
    </el-form>

    <section v-if="result" class="bulk-import-result">
      <el-descriptions :column="5" border size="small">
        <el-descriptions-item label="总行数">{{ result.totalRows }}</el-descriptions-item>
        <el-descriptions-item label="成功">{{ result.successCount }}</el-descriptions-item>
        <el-descriptions-item label="重复">{{ result.duplicateCount }}</el-descriptions-item>
        <el-descriptions-item label="失败">{{ result.failedCount }}</el-descriptions-item>
        <el-descriptions-item label="跳过">{{ result.skippedCount }}</el-descriptions-item>
      </el-descriptions>

      <el-collapse
        v-if="result.duplicateRows.length || result.failedRows.length"
        class="bulk-import-collapse"
      >
        <el-collapse-item v-if="result.duplicateRows.length" title="重复行" name="duplicates">
          <ul class="import-row-list">
            <li v-for="row in result.duplicateRows" :key="`${row.rowIndex}-${row.promptText}`">
              第 {{ row.rowIndex }} 行：{{ row.promptText }}（{{
                duplicateReasonLabelMap[row.reason] ?? row.reason
              }}）
            </li>
          </ul>
        </el-collapse-item>
        <el-collapse-item v-if="result.failedRows.length" title="失败行" name="failed">
          <ul class="import-row-list">
            <li v-for="row in result.failedRows" :key="row.rowIndex">
              第 {{ row.rowIndex }} 行：{{ row.errors.join("；") }}
            </li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </section>

    <template #footer>
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">开始导入</el-button>
    </template>
  </el-dialog>
</template>

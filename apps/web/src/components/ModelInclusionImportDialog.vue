<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  ImportModelInclusionRecordRow,
  ImportModelInclusionRecordsResult
} from "@/api/model-inclusion";

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  errorMessage?: string;
  result?: ImportModelInclusionRecordsResult | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [rows: ImportModelInclusionRecordRow[]];
}>();

const rowsText = ref("");
const localError = ref("");

const sampleRows = `[
  {
    "promptText": "激光测距传感器怎么选",
    "model": "deepseek",
    "brandMentioned": true,
    "brandRecommended": false,
    "citedOfficialSite": true,
    "answerSummary": "回答提到品牌但未作为首选推荐",
    "competitors": ["竞品A", "竞品B"]
  }
]`;

const failedRows = computed(() => props.result?.failedRows ?? []);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      rowsText.value = sampleRows;
      localError.value = "";
    }
  }
);

const close = () => {
  emit("update:modelValue", false);
};

const parseRows = () => {
  localError.value = "";

  try {
    const parsed = JSON.parse(rowsText.value) as unknown;
    if (!Array.isArray(parsed)) {
      localError.value = "请粘贴 JSON 数组 rows。";
      return;
    }

    emit("submit", parsed as ImportModelInclusionRecordRow[]);
  } catch (error) {
    localError.value = error instanceof Error ? error.message : "JSON 解析失败。";
  }
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="批量导入模型覆盖记录"
    width="920px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      title="第一版支持粘贴 JSON 数据行。布尔值可用 true/false、1/0、是/否、yes/no；单行失败不会影响其他行。"
      type="info"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="localError || errorMessage"
      :title="localError || errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-input v-model="rowsText" type="textarea" :rows="14" placeholder="粘贴 JSON 数据行数组" />

    <section v-if="result" class="model-import-result">
      <div class="model-import-result__metrics">
        <span>总行数：{{ result.totalRows }}</span>
        <span>成功：{{ result.successCount }}</span>
        <span>失败：{{ result.failedCount }}</span>
      </div>
      <el-collapse v-if="failedRows.length > 0">
        <el-collapse-item title="查看失败行" name="failedRows">
          <div v-for="row in failedRows" :key="row.rowIndex" class="failed-row">
            <strong>第 {{ row.rowIndex }} 行</strong>
            <p>{{ row.errors.join("；") }}</p>
            <pre>{{ JSON.stringify(row.row, null, 2) }}</pre>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <template #footer>
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" :loading="submitting" @click="parseRows">开始导入</el-button>
    </template>
  </el-dialog>
</template>

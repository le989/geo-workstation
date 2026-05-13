<script setup lang="ts">
import { computed } from "vue";
import type { ExpansionCandidate } from "@/api/expansion";
import { formatDateTime, formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import {
  contentTypeLabelMap,
  duplicateReasonLabelMap,
  saveStatusLabelMap
} from "@/config/expansion-options";

const props = defineProps<{
  candidates: ExpansionCandidate[];
  modelValue: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const selectedIds = computed(() => new Set(props.modelValue));

const isCandidateSelectable = (candidate: ExpansionCandidate) =>
  !candidate.duplicateInBatch &&
  !candidate.duplicateInDatabase &&
  !candidate.selected &&
  !candidate.savedPromptId;

const selectableCandidates = computed(() => props.candidates.filter(isCandidateSelectable));
const duplicateCount = computed(
  () => props.candidates.filter((item) => item.duplicateInBatch || item.duplicateInDatabase).length
);
const savedCount = computed(
  () => props.candidates.filter((item) => item.selected || item.savedPromptId).length
);

const updateSelection = (candidate: ExpansionCandidate, checked: string | number | boolean) => {
  const next = new Set(props.modelValue);

  if (checked) {
    next.add(candidate.id);
  } else {
    next.delete(candidate.id);
  }

  emit("update:modelValue", [...next]);
};

const handleCheckboxChange = (
  candidate: ExpansionCandidate,
  checked: string | number | boolean
) => {
  updateSelection(candidate, checked);
};

const selectNonDuplicateCandidates = () => {
  emit(
    "update:modelValue",
    selectableCandidates.value.map((candidate) => candidate.id)
  );
};

const clearSelection = () => {
  emit("update:modelValue", []);
};

const resolveDuplicateText = (candidate: ExpansionCandidate) => {
  if (candidate.duplicateInDatabase) {
    return "库内重复，不建议保存";
  }

  if (candidate.duplicateInBatch) {
    return "本批重复";
  }

  return "--";
};
</script>

<template>
  <section class="expansion-candidate-panel">
    <div class="expansion-candidate-header">
      <div>
        <p class="section-kicker">候选词</p>
        <h2>候选词结果</h2>
        <p>候选词不会自动进入策略库，重复项默认不建议保存，需要人工勾选后提交。</p>
      </div>
      <div class="expansion-candidate-actions">
        <el-tag type="info" effect="plain">候选 {{ candidates.length }}</el-tag>
        <el-tag type="warning" effect="plain">重复 {{ duplicateCount }}</el-tag>
        <el-tag type="success" effect="plain">已保存 {{ savedCount }}</el-tag>
        <el-button @click="selectNonDuplicateCandidates">一键勾选非重复项</el-button>
        <el-button @click="clearSelection">清空选择</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="candidates"
      class="expansion-candidate-table"
      row-key="id"
      border
      empty-text="暂无候选词，请调整输入或补充场景约束后重试。"
    >
      <el-table-column label="勾选" width="72" fixed="left" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-checkbox
            :model-value="selectedIds.has(row.id)"
            :disabled="!isCandidateSelectable(row)"
            @change="handleCheckboxChange(row, $event)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="promptText" label="GEO 候选提示词" min-width="270" fixed="left">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <strong class="prompt-text-cell">{{ row.promptText }}</strong>
          <small v-if="row.duplicateInDatabase" class="candidate-hint">库内重复，不建议保存</small>
          <small v-else-if="row.duplicateInBatch" class="candidate-hint">本批重复</small>
        </template>
      </el-table-column>
      <el-table-column prop="baseWord" label="训练词" min-width="150">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{ formatOptional(row.baseWord) }}
        </template>
      </el-table-column>
      <el-table-column prop="userIntent" label="用户意图" width="126">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{ row.userIntent ? userIntentLabelMap[row.userIntent] : "--" }}
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="104" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag
            :type="row.priority <= 2 ? 'danger' : row.priority === 3 ? 'warning' : 'info'"
            effect="plain"
          >
            P{{ row.priority }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="recommendedContentType" label="推荐内容方向" min-width="190">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{
            row.recommendedContentType
              ? (contentTypeLabelMap[row.recommendedContentType] ?? row.recommendedContentType)
              : "--"
          }}
        </template>
      </el-table-column>
      <el-table-column prop="duplicateInBatch" label="本批重复" width="152" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag v-if="row.duplicateInBatch" type="warning" effect="plain">本批重复</el-tag>
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column prop="duplicateInDatabase" label="库内重复" width="168" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag v-if="row.duplicateInDatabase" type="danger" effect="plain">
            库内重复，不建议保存
          </el-tag>
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column prop="duplicateReason" label="重复原因" min-width="178">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{
            row.duplicateReason
              ? duplicateReasonLabelMap[row.duplicateReason]
              : resolveDuplicateText(row)
          }}
        </template>
      </el-table-column>
      <el-table-column prop="selected" label="保存结果" width="104" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag :type="row.selected ? 'success' : 'info'" effect="plain">
            {{ row.selected ? "已保存" : "未保存" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="savedPromptId" label="已保存提示词 ID" min-width="190">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{ row.savedPromptId ?? "--" }}
        </template>
      </el-table-column>
      <el-table-column prop="saveStatus" label="保存状态" width="132" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag
            :type="
              row.saveStatus === 'saved'
                ? 'success'
                : row.saveStatus === 'pending'
                  ? 'info'
                  : 'warning'
            "
            effect="plain"
          >
            {{ saveStatusLabelMap[row.saveStatus] ?? row.saveStatus }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" min-width="176">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

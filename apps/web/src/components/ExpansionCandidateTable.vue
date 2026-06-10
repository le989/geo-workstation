<script setup lang="ts">
import { computed } from "vue";
import type { ExpansionCandidate } from "@/api/expansion";
import {
  formatDateTime,
  formatOptional,
  inferQuestionType,
  userIntentLabelMap
} from "@/config/geo-prompt-options";
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

const resolveDuplicateStatus = (candidate: ExpansionCandidate) => {
  if (candidate.duplicateInDatabase) {
    return { label: "库内重复", type: "danger" as const };
  }

  if (candidate.duplicateInBatch) {
    return { label: "本批重复", type: "warning" as const };
  }

  return { label: "可保存", type: "success" as const };
};

const resolveSaveStatus = (candidate: ExpansionCandidate) => {
  if (candidate.selected || candidate.savedPromptId || candidate.saveStatus === "saved") {
    return { label: "已保存", type: "success" as const };
  }

  if (candidate.saveStatus === "pending") {
    return { label: "待保存", type: "info" as const };
  }

  return {
    label: saveStatusLabelMap[candidate.saveStatus] ?? candidate.saveStatus,
    type: "warning" as const
  };
};

const getCandidateQuestionTypeLabel = (candidate: ExpansionCandidate) =>
  inferQuestionType(
    [candidate.promptText, candidate.recommendedContentType ?? ""].join(" "),
    candidate.userIntent
  ).label;
</script>

<template>
  <section class="expansion-candidate-panel">
    <div class="expansion-candidate-header">
      <div>
        <p class="section-kicker">候选词</p>
        <h2>候选词结果</h2>
        <p>候选词不会自动进入策略库，重复项默认不建议保存，确认词意和分类后再勾选提交。</p>
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
      <el-table-column type="expand" width="44">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <div class="expansion-candidate-detail">
            <section>
              <p class="section-kicker">策略信息</p>
              <dl>
                <div>
                  <dt>训练词</dt>
                  <dd>{{ formatOptional(row.baseWord) }}</dd>
                </div>
                <div>
                  <dt>推荐内容方向</dt>
                  <dd>
                    {{
                      row.recommendedContentType
                        ? (contentTypeLabelMap[row.recommendedContentType] ??
                          row.recommendedContentType)
                        : "--"
                    }}
                  </dd>
                </div>
                <div>
                  <dt>问法类型</dt>
                  <dd>{{ getCandidateQuestionTypeLabel(row) }}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{{ formatDateTime(row.createdAt) }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <p class="section-kicker">排查信息</p>
              <dl>
                <div>
                  <dt>重复原因</dt>
                  <dd>
                    {{
                      row.duplicateReason
                        ? duplicateReasonLabelMap[row.duplicateReason]
                        : resolveDuplicateText(row)
                    }}
                  </dd>
                </div>
                <div>
                  <dt>已保存提示词 ID</dt>
                  <dd>{{ row.savedPromptId ?? "--" }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="promptText" label="候选提示词" min-width="320" fixed="left">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <strong class="prompt-text-cell">{{ row.promptText }}</strong>
          <small v-if="row.duplicateInDatabase" class="candidate-hint">库内重复，不建议保存</small>
          <small v-else-if="row.duplicateInBatch" class="candidate-hint">本批重复</small>
        </template>
      </el-table-column>
      <el-table-column prop="userIntent" label="类型 / 意图" width="156">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <div class="candidate-intent-cell">
            <span>用户问题</span>
            <strong>{{ row.userIntent ? userIntentLabelMap[row.userIntent] : "--" }}</strong>
            <small class="question-type-chip">问法类型：{{ getCandidateQuestionTypeLabel(row) }}</small>
          </div>
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
      <el-table-column label="重复状态" width="128" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag :type="resolveDuplicateStatus(row).type" effect="plain">
            {{ resolveDuplicateStatus(row).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="recommendedContentType" label="建议动作" min-width="170">
        <template #default="{ row }: { row: ExpansionCandidate }">
          {{
            row.recommendedContentType
              ? (contentTypeLabelMap[row.recommendedContentType] ?? row.recommendedContentType)
              : "--"
          }}
        </template>
      </el-table-column>
      <el-table-column prop="saveStatus" label="保存状态" width="122" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <el-tag :type="resolveSaveStatus(row).type" effect="plain">
            {{ resolveSaveStatus(row).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="108" fixed="right" align="center">
        <template #default="{ row }: { row: ExpansionCandidate }">
          <div class="candidate-action-cell">
            <el-checkbox
              v-if="isCandidateSelectable(row)"
              :model-value="selectedIds.has(row.id)"
              @change="handleCheckboxChange(row, $event)"
            >
              选择
            </el-checkbox>
            <span v-else class="muted-candidate-action">不可保存</span>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

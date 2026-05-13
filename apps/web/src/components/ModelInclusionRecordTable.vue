<script setup lang="ts">
import type { ModelInclusionRecord } from "@/api/model-inclusion";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import ModelInclusionBooleanTag from "@/components/ModelInclusionBooleanTag.vue";
import RecordMethodTag from "@/components/RecordMethodTag.vue";
import { formatDateTime, formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import { formatCompetitors, truncateSummary } from "@/config/model-inclusion-options";

defineProps<{
  records: ModelInclusionRecord[];
  loading?: boolean;
}>();

const getUserIntentLabel = (record: ModelInclusionRecord) =>
  userIntentLabelMap[record.geoPrompt.userIntent] ?? record.geoPrompt.userIntent;
</script>

<template>
  <el-table
    v-loading="loading"
    :data="records"
    border
    row-key="id"
    empty-text="暂无模型覆盖记录"
    class="model-record-table"
  >
    <el-table-column label="GEO 提示词" min-width="280" fixed>
      <template #default="{ row }">
        <strong>{{ row.geoPrompt.promptText }}</strong>
        <p class="table-subtext">
          {{ formatOptional(row.geoPrompt.productLine) }} /
          {{ getUserIntentLabel(row) }}
        </p>
      </template>
    </el-table-column>
    <el-table-column label="类型" width="100">
      <template #default="{ row }">
        <GeoPromptTypeTag :type="row.geoPrompt.type" />
      </template>
    </el-table-column>
    <el-table-column label="AI 模型" width="130" prop="model" />
    <el-table-column label="查询时间" width="180">
      <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
    </el-table-column>
    <el-table-column label="品牌提及" width="110">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.brandMentioned"
          true-label="已提及"
          false-label="未提及"
        />
      </template>
    </el-table-column>
    <el-table-column label="品牌推荐" width="110">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.brandRecommended"
          true-label="已推荐"
          false-label="未推荐"
        />
      </template>
    </el-table-column>
    <el-table-column label="推荐位置" width="100">
      <template #default="{ row }">{{ row.rankingPosition ?? "--" }}</template>
    </el-table-column>
    <el-table-column label="官网引用" width="120">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.citedOfficialSite"
          true-label="已引用官网"
          false-label="未引用官网"
        />
      </template>
    </el-table-column>
    <el-table-column label="回答摘要" min-width="260">
      <template #default="{ row }">{{ truncateSummary(row.answerSummary) }}</template>
    </el-table-column>
    <el-table-column label="竞品提及" min-width="180">
      <template #default="{ row }">{{ formatCompetitors(row.competitors) }}</template>
    </el-table-column>
    <el-table-column label="记录方式" width="110">
      <template #default="{ row }">
        <RecordMethodTag :method="row.recordMethod" />
      </template>
    </el-table-column>
    <el-table-column label="创建时间" width="180">
      <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </el-table-column>
  </el-table>
</template>

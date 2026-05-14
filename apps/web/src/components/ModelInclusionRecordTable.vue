<script setup lang="ts">
import type { ModelInclusionRecord } from "@/api/model-inclusion";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import ModelInclusionBooleanTag from "@/components/ModelInclusionBooleanTag.vue";
import RecordMethodTag from "@/components/RecordMethodTag.vue";
import { formatDateTime, formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";
import {
  detectionMethodLabelMap,
  deviceTypeLabelMap,
  entryPointLabelMap,
  formatCompetitors,
  hitLevelLabelMap,
  hitLevelTypeMap,
  truncateSummary
} from "@/config/model-inclusion-options";

defineProps<{
  records: ModelInclusionRecord[];
  loading?: boolean;
}>();

const getUserIntentLabel = (record: ModelInclusionRecord) =>
  userIntentLabelMap[record.geoPrompt.userIntent] ?? record.geoPrompt.userIntent;

const formatEntryPoint = (value?: string) =>
  value ? (entryPointLabelMap[value as keyof typeof entryPointLabelMap] ?? value) : "--";

const formatDetectionMethod = (value?: string) =>
  value ? (detectionMethodLabelMap[value as keyof typeof detectionMethodLabelMap] ?? value) : "--";

const formatDeviceType = (value?: string) =>
  value ? (deviceTypeLabelMap[value as keyof typeof deviceTypeLabelMap] ?? value) : "--";

const formatHitLevel = (value?: string) =>
  value ? (hitLevelLabelMap[value as keyof typeof hitLevelLabelMap] ?? value) : "未判断";

const getHitLevelType = (value?: string) =>
  (value ? hitLevelTypeMap[value as keyof typeof hitLevelTypeMap] : "info") as
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info";

const formatJsonPreview = (value?: unknown) => {
  if (!value) {
    return "--";
  }

  return truncateSummary(JSON.stringify(value), 120);
};
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
    <el-table-column label="平台" width="120">
      <template #default="{ row }">{{ formatOptional(row.platform) }}</template>
    </el-table-column>
    <el-table-column label="入口" width="130">
      <template #default="{ row }">{{ formatEntryPoint(row.entryPoint) }}</template>
    </el-table-column>
    <el-table-column label="命中等级" width="120">
      <template #default="{ row }">
        <el-tag :type="getHitLevelType(row.hitLevel)" effect="plain">
          {{ formatHitLevel(row.hitLevel) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="检测方式" width="130">
      <template #default="{ row }">{{ formatDetectionMethod(row.detectionMethod) }}</template>
    </el-table-column>
    <el-table-column label="设备" width="100">
      <template #default="{ row }">{{ formatDeviceType(row.deviceType) }}</template>
    </el-table-column>
    <el-table-column label="查询时间" width="180">
      <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
    </el-table-column>
    <el-table-column label="联网" width="90">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.isWebSearchEnabled"
          true-label="联网"
          false-label="未联网"
        />
      </template>
    </el-table-column>
    <el-table-column label="登录" width="90">
      <template #default="{ row }">
        <ModelInclusionBooleanTag :value="row.isLoggedIn" true-label="登录" false-label="未登录" />
      </template>
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
    <el-table-column label="内容引用" width="120">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.citedContentAsset"
          true-label="已引用内容"
          false-label="未引用内容"
        />
      </template>
    </el-table-column>
    <el-table-column label="出现竞品" width="120">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.competitorMentioned"
          true-label="出现竞品"
          false-label="未出现"
        />
      </template>
    </el-table-column>
    <el-table-column label="回答摘要" min-width="260">
      <template #default="{ row }">{{ truncateSummary(row.answerSummary) }}</template>
    </el-table-column>
    <el-table-column label="原始回答 / 证据" min-width="260">
      <template #default="{ row }">
        <el-collapse v-if="row.rawAnswer || row.citations || row.searchResults || row.errorMessage">
          <el-collapse-item title="查看详情" :name="row.id">
            <p v-if="row.rawAnswer">{{ truncateSummary(row.rawAnswer, 400) }}</p>
            <p v-if="row.citations">引用：{{ formatJsonPreview(row.citations) }}</p>
            <p v-if="row.searchResults">搜索：{{ formatJsonPreview(row.searchResults) }}</p>
            <p v-if="row.screenshotPath">截图：{{ row.screenshotPath }}</p>
            <p v-if="row.errorMessage">错误：{{ row.errorMessage }}</p>
          </el-collapse-item>
        </el-collapse>
        <span v-else>--</span>
      </template>
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

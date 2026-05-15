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

const formatJsonBlock = (value?: unknown) => {
  if (!value) {
    return "--";
  }

  return JSON.stringify(value, null, 2);
};

const getRowClassName = ({ row }: { row: ModelInclusionRecord }) =>
  ["not_mentioned", "competitor_only", "unclear"].includes(String(row.hitLevel))
    ? "model-record-row--risk"
    : "";
</script>

<template>
  <el-table
    v-loading="loading"
    :data="records"
    :row-class-name="getRowClassName"
    border
    row-key="id"
    empty-text="暂无模型覆盖记录"
    class="model-record-table"
  >
    <el-table-column type="expand" width="54">
      <template #default="{ row }">
        <div class="model-record-detail">
          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">结果摘要</p>
              <h3>{{ row.geoPrompt.promptText }}</h3>
            </div>
            <div class="model-record-detail__grid">
              <span>平台 / 模型</span>
              <strong>{{ formatOptional(row.platform) }} / {{ row.model }}</strong>
              <span>入口 / 方式</span>
              <strong>
                {{ formatEntryPoint(row.entryPoint) }} /
                {{ formatDetectionMethod(row.detectionMethod) }}
              </strong>
              <span>设备 / 登录</span>
              <strong>
                {{ formatDeviceType(row.deviceType) }} /
                {{ row.isLoggedIn ? "登录" : "未登录" }}
              </strong>
              <span>联网搜索</span>
              <strong>{{ row.isWebSearchEnabled ? "已启用" : "未启用" }}</strong>
              <span>推荐位置</span>
              <strong>{{ row.rankingPosition ?? "--" }}</strong>
              <span>记录方式</span>
              <strong>
                <RecordMethodTag :method="row.recordMethod" />
              </strong>
              <span>重试 / 错误分类</span>
              <strong>{{ row.retryCount ?? 0 }} / {{ row.errorCategory ?? "--" }}</strong>
              <span>竞品提及</span>
              <strong>{{ formatCompetitors(row.competitors) }}</strong>
            </div>
          </section>

          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">回答内容</p>
              <h3>摘要与原始回答</h3>
            </div>
            <p class="model-record-answer">{{ row.answerSummary || "暂无回答摘要" }}</p>
            <el-collapse v-if="row.rawAnswer">
              <el-collapse-item title="展开原始回答" :name="`${row.id}-rawAnswer`">
                <pre>{{ row.rawAnswer }}</pre>
              </el-collapse-item>
            </el-collapse>
          </section>

          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">证据 / 引用</p>
              <h3>来源、搜索结果与错误信息</h3>
            </div>
            <el-collapse>
              <el-collapse-item title="引用来源 citations" :name="`${row.id}-citations`">
                <pre>{{ formatJsonBlock(row.citations) }}</pre>
              </el-collapse-item>
              <el-collapse-item title="搜索结果 searchResults" :name="`${row.id}-searchResults`">
                <pre>{{ formatJsonBlock(row.searchResults) }}</pre>
              </el-collapse-item>
              <el-collapse-item
                v-if="row.screenshotPath"
                title="截图路径"
                :name="`${row.id}-screenshotPath`"
              >
                <p>{{ row.screenshotPath }}</p>
              </el-collapse-item>
              <el-collapse-item
                v-if="row.errorMessage"
                title="错误信息"
                :name="`${row.id}-errorMessage`"
              >
                <p>{{ row.errorMessage }}</p>
              </el-collapse-item>
            </el-collapse>
          </section>

          <section>
            <el-collapse>
              <el-collapse-item title="技术信息" :name="`${row.id}-tech`">
                <div class="model-record-tech-grid">
                  <span>记录 ID</span>
                  <strong>{{ row.id }}</strong>
                  <span>GEO 提示词 ID</span>
                  <strong>{{ row.geoPromptId }}</strong>
                  <span>创建人</span>
                  <strong>{{ row.createdBy }}</strong>
                  <span>创建时间</span>
                  <strong>{{ formatDateTime(row.createdAt) }}</strong>
                  <span>检测时间</span>
                  <strong>{{ formatDateTime(row.checkedAt) }}</strong>
                </div>
              </el-collapse-item>
            </el-collapse>
          </section>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="GEO 提示词" min-width="300" fixed>
      <template #default="{ row }">
        <strong class="model-record-prompt">{{ row.geoPrompt.promptText }}</strong>
        <p class="table-subtext">
          {{ formatOptional(row.geoPrompt.productLine) }} / {{ getUserIntentLabel(row) }} /
          <GeoPromptTypeTag :type="row.geoPrompt.type" />
        </p>
      </template>
    </el-table-column>

    <el-table-column label="模型 / 平台" min-width="180">
      <template #default="{ row }">
        <strong>{{ formatOptional(row.platform) }}</strong>
        <p class="table-subtext">{{ row.model }}</p>
        <p class="table-subtext">{{ formatEntryPoint(row.entryPoint) }}</p>
      </template>
    </el-table-column>

    <el-table-column label="命中状态" width="130">
      <template #default="{ row }">
        <el-tag :type="getHitLevelType(row.hitLevel)" effect="plain">
          {{ formatHitLevel(row.hitLevel) }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="品牌判断" min-width="220">
      <template #default="{ row }">
        <div class="model-record-tag-stack">
          <ModelInclusionBooleanTag
            :value="row.brandMentioned"
            true-label="已提及"
            false-label="未提及"
          />
          <ModelInclusionBooleanTag
            :value="row.brandRecommended"
            true-label="已推荐"
            false-label="未推荐"
          />
          <ModelInclusionBooleanTag
            :value="row.citedOfficialSite"
            true-label="引用官网"
            false-label="未引官网"
          />
        </div>
      </template>
    </el-table-column>

    <el-table-column label="竞品占位" width="150">
      <template #default="{ row }">
        <ModelInclusionBooleanTag
          :value="row.competitorMentioned"
          true-label="出现竞品"
          false-label="未出现"
        />
        <p class="table-subtext">{{ formatCompetitors(row.competitors) }}</p>
      </template>
    </el-table-column>

    <el-table-column label="回答摘要" min-width="260">
      <template #default="{ row }">
        <p class="model-record-summary">{{ truncateSummary(row.answerSummary, 140) }}</p>
      </template>
    </el-table-column>

    <el-table-column label="检测时间" width="170">
      <template #default="{ row }">{{ formatDateTime(row.checkedAt) }}</template>
    </el-table-column>
  </el-table>
</template>

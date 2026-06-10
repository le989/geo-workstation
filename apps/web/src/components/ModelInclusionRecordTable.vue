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
  formatDisplayLabel,
  hitLevelLabelMap,
  hitLevelTypeMap,
  inferCoverageReview,
  truncateSummary,
  type CoverageReviewStatus
} from "@/config/model-inclusion-options";

defineProps<{
  records: ModelInclusionRecord[];
  loading?: boolean;
  canManageRecords?: boolean;
}>();

const emit = defineEmits<{
  edit: [record: ModelInclusionRecord];
  void: [record: ModelInclusionRecord];
  restore: [record: ModelInclusionRecord];
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

const formatPromptDisplay = (value: string) => formatDisplayLabel(value, value);

const formatBrandSignals = (record: ModelInclusionRecord) => {
  const signals = [
    record.brandMentioned ? "提及品牌" : "未提及品牌",
    record.brandRecommended ? "推荐品牌" : "未推荐",
    record.citedOfficialSite ? "引用官网" : "未引官网"
  ];

  return signals.join(" / ");
};

const getCoverageReview = (record: ModelInclusionRecord) => inferCoverageReview(record);

const getCoverageReviewType = (status: CoverageReviewStatus) => {
  if (status === "good") {
    return "success";
  }
  if (status === "manual_review") {
    return "warning";
  }

  return "danger";
};

const getCoverageReviewLabel = (status: CoverageReviewStatus) => {
  if (status === "good") {
    return "表现较好";
  }
  if (status === "manual_review") {
    return "需人工复核";
  }

  return "建议补救";
};

const getRowClassName = ({ row }: { row: ModelInclusionRecord }) =>
  row.voidedAt
    ? "model-record-row--voided"
    : ["not_mentioned", "competitor_only", "unclear"].includes(String(row.hitLevel))
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
    <el-table-column type="expand" label="详情" width="64">
      <template #default="{ row }">
        <div class="model-record-detail">
          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">核心结论</p>
              <h3>{{ formatPromptDisplay(row.geoPrompt.promptText) }}</h3>
            </div>
            <div class="model-record-detail__grid">
              <span>平台 / 模型</span>
              <strong>{{ formatOptional(row.platform) }} / {{ row.model }}</strong>
              <span>命中等级</span>
              <strong>{{ formatHitLevel(row.hitLevel) }}</strong>
              <span>品牌信号</span>
              <strong>{{ formatBrandSignals(row) }}</strong>
              <span>竞品提及</span>
              <strong>{{ formatCompetitors(row.competitors) }}</strong>
              <span>推荐位置</span>
              <strong>{{ row.rankingPosition ?? "--" }}</strong>
              <span>记录方式</span>
              <strong>
                <RecordMethodTag :method="row.recordMethod" />
              </strong>
              <span>记录状态</span>
              <strong>{{ row.voidedAt ? "已作废" : "正常" }}</strong>
              <span v-if="row.voidedAt">作废原因</span>
              <strong v-if="row.voidedAt">{{ row.voidReason || "--" }}</strong>
              <span v-if="row.restoredAt">最近恢复</span>
              <strong v-if="row.restoredAt">{{ formatDateTime(row.restoredAt) }}</strong>
            </div>
          </section>

          <section
            v-for="review in [getCoverageReview(row)]"
            :key="review.status"
            :class="['model-record-review', `is-${review.status}`]"
          >
            <div class="model-record-detail__header model-record-review__header">
              <div>
                <p class="section-kicker">复盘建议</p>
                <h3>未推荐原因复盘</h3>
                <p>基于当前检测结果做优化参考，不代表真实模型内部判断。</p>
              </div>
              <el-tag :type="getCoverageReviewType(review.status)" effect="plain">
                {{ getCoverageReviewLabel(review.status) }}
              </el-tag>
            </div>

            <p v-if="review.status === 'good'" class="model-record-review__good">
              当前记录表现较好，可继续跟踪复测，暂不需要优先补救。
            </p>

            <div class="model-record-review__grid">
              <article>
                <span>可能原因</span>
                <ul>
                  <li v-for="reason in review.reasons" :key="reason">
                    {{ reason }}
                  </li>
                </ul>
              </article>
              <article>
                <span>下一步建议</span>
                <ul>
                  <li v-for="action in review.nextActions" :key="action">
                    {{ action }}
                  </li>
                </ul>
              </article>
              <article>
                <span>建议补充内容类型</span>
                <div class="model-record-review__tags">
                  <el-tag
                    v-for="contentType in review.contentTypes"
                    :key="contentType"
                    effect="plain"
                  >
                    {{ contentType }}
                  </el-tag>
                </div>
              </article>
              <article>
                <span>建议补充证据类型</span>
                <div class="model-record-review__tags">
                  <el-tag
                    v-for="evidenceType in review.evidenceTypes"
                    :key="evidenceType"
                    effect="plain"
                  >
                    {{ evidenceType }}
                  </el-tag>
                </div>
              </article>
            </div>
            <p class="model-record-review__note">
              该复盘仅基于当前检测字段做辅助判断，最终仍需结合原始回答和人工判断。
            </p>
          </section>

          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">证据与回答</p>
              <h3>摘要、原文与引用来源</h3>
            </div>
            <p class="model-record-answer">{{ row.answerSummary || "暂无回答摘要" }}</p>
            <el-collapse v-if="row.rawAnswer">
              <el-collapse-item title="展开原始回答" :name="`${row.id}-rawAnswer`">
                <pre>{{ row.rawAnswer }}</pre>
              </el-collapse-item>
            </el-collapse>
            <el-collapse v-if="row.citations || row.searchResults">
              <el-collapse-item title="引用来源" :name="`${row.id}-citations`">
                <pre>{{ formatJsonBlock(row.citations) }}</pre>
              </el-collapse-item>
              <el-collapse-item title="联网搜索结果" :name="`${row.id}-searchResults`">
                <pre>{{ formatJsonBlock(row.searchResults) }}</pre>
              </el-collapse-item>
            </el-collapse>
          </section>

          <section>
            <div class="model-record-detail__header">
              <p class="section-kicker">检测上下文</p>
              <h3>入口、方式与错误线索</h3>
            </div>
            <div class="model-record-detail__grid">
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
              <span>重试 / 错误分类</span>
              <strong>{{ row.retryCount ?? 0 }} / {{ row.errorCategory ?? "--" }}</strong>
            </div>
            <el-collapse v-if="row.screenshotPath || row.errorMessage">
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

          <section class="model-record-detail__tech">
            <el-collapse>
              <el-collapse-item title="排查信息" :name="`${row.id}-tech`">
                <div class="model-record-tech-grid">
                  <span>记录 ID</span>
                  <strong>{{ row.id }}</strong>
                  <span>GEO 提示词 ID</span>
                  <strong>{{ row.geoPromptId }}</strong>
                  <span>原始提示词</span>
                  <strong>{{ row.geoPrompt.promptText }}</strong>
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
        <strong class="model-record-prompt">
          {{ formatPromptDisplay(row.geoPrompt.promptText) }}
        </strong>
        <p class="table-subtext">
          {{ formatDisplayLabel(row.geoPrompt.productLine) }} / {{ getUserIntentLabel(row) }} /
          <GeoPromptTypeTag :type="row.geoPrompt.type" />
        </p>
      </template>
    </el-table-column>

    <el-table-column label="监测模型" min-width="190">
      <template #default="{ row }">
        <strong>{{ formatOptional(row.platform) }}</strong>
        <p class="table-subtext">{{ row.model }}</p>
        <p class="table-subtext">{{ formatEntryPoint(row.entryPoint) }}</p>
      </template>
    </el-table-column>

    <el-table-column label="覆盖结论" min-width="260">
      <template #default="{ row }">
        <el-tag :type="getHitLevelType(row.hitLevel)" effect="plain">
          {{ formatHitLevel(row.hitLevel) }}
        </el-tag>
        <div class="model-record-tag-stack model-record-tag-stack--inline">
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
        <p class="table-subtext">
          {{ row.competitorMentioned ? "出现竞品：" : "竞品：" }}
          {{ formatCompetitors(row.competitors) }}
        </p>
      </template>
    </el-table-column>

    <el-table-column label="回答摘要" min-width="340">
      <template #default="{ row }">
        <p class="model-record-summary">{{ truncateSummary(row.answerSummary, 140) }}</p>
      </template>
    </el-table-column>

    <el-table-column label="检测信息" width="190">
      <template #default="{ row }">
        <strong>{{ formatDateTime(row.checkedAt) }}</strong>
        <p class="table-subtext">
          <RecordMethodTag :method="row.recordMethod" />
        </p>
        <el-tag v-if="row.voidedAt" type="danger" effect="plain">已作废</el-tag>
        <el-tag v-else type="success" effect="plain">正常</el-tag>
      </template>
    </el-table-column>

    <el-table-column v-if="canManageRecords" label="操作" width="156" fixed="right">
      <template #default="{ row }">
        <div class="model-record-actions">
          <el-button size="small" text type="primary" @click="emit('edit', row)">
            {{ row.voidedAt ? "查看" : "编辑" }}
          </el-button>
          <el-button
            v-if="!row.voidedAt"
            size="small"
            text
            type="danger"
            @click="emit('void', row)"
          >
            作废
          </el-button>
          <el-button v-else size="small" text type="success" @click="emit('restore', row)">
            恢复
          </el-button>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

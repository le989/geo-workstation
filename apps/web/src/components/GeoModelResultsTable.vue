<script setup lang="ts">
import type { GeoModelResult } from "@/api/geo-analysis";
import {
  formatGeoAnalysisDisplayText,
  formatTargetModelName
} from "@/config/geo-analysis-options";
import { formatDateTime } from "@/config/geo-prompt-options";
import ModelInclusionBooleanTag from "@/components/ModelInclusionBooleanTag.vue";

defineProps<{
  results: GeoModelResult[];
}>();
</script>

<template>
  <section class="model-results">
    <div class="section-heading">
      <div>
        <p class="section-kicker">模型结果</p>
        <h3>模型表现</h3>
        <p>查看每个目标模型下品牌是否被提及、推荐、引用官网，以及竞品是否出现。</p>
      </div>
    </div>

    <el-table :data="results" border empty-text="暂无模型分析结果" class="model-results-table">
      <el-table-column label="GEO 提问" min-width="260">
        <template #default="{ row }">
          <strong>{{ formatGeoAnalysisDisplayText(row.promptText, "GEO 诊断问题") }}</strong>
          <p class="table-subtext">{{ formatDateTime(row.createdAt) }}</p>
        </template>
      </el-table-column>
      <el-table-column label="模型" width="150">
        <template #default="{ row }">
          {{ formatTargetModelName(row.model) }}
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
        <template #default="{ row }">
          {{ row.rankingPosition ?? "--" }}
        </template>
      </el-table-column>
      <el-table-column label="官网引用" width="120">
        <template #default="{ row }">
          <ModelInclusionBooleanTag
            :value="row.citedOfficialSite"
            true-label="已引用"
            false-label="未引用"
          />
        </template>
      </el-table-column>
      <el-table-column label="回答摘要" min-width="240">
        <template #default="{ row }">
          <p class="analysis-text-preview">
            {{ formatGeoAnalysisDisplayText(row.answerSummary, "暂无回答摘要") }}
          </p>
        </template>
      </el-table-column>
      <el-table-column label="竞品出现" min-width="160">
        <template #default="{ row }">
          {{ row.competitors.length > 0 ? row.competitors.join("、") : "--" }}
        </template>
      </el-table-column>
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="raw-answer-block">
            <p class="section-kicker">原始回答</p>
            <pre>{{ row.rawAnswer || "暂无原始回答" }}</pre>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.model-results {
  display: grid;
  gap: 14px;
}

.section-heading h3 {
  margin: 4px 0;
  color: #1f2937;
}

.section-heading p {
  margin: 0;
  color: #64748b;
}

.model-results-table {
  width: 100%;
}

.analysis-text-preview {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #334155;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.raw-answer-block {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.raw-answer-block pre {
  max-height: 260px;
  margin: 8px 0 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #334155;
  line-height: 1.6;
}
</style>

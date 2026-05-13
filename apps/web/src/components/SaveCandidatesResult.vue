<script setup lang="ts">
import type { SaveExpansionCandidatesResult } from "@/api/expansion";

defineProps<{
  result?: SaveExpansionCandidatesResult | null;
}>();

const skippedReasonLabelMap: Record<string, string> = {
  already_saved: "候选词已保存",
  duplicate_in_database: "提示词策略库已存在"
};

const failedReasonLabelMap: Record<string, string> = {
  candidate_not_found: "候选词不存在",
  candidate_not_in_job: "候选词不属于当前任务",
  save_failed: "保存失败"
};
</script>

<template>
  <section v-if="result" class="save-candidates-result">
    <div class="save-candidates-result__header">
      <div>
        <p class="section-kicker">保存结果</p>
        <h2>保存结果反馈</h2>
        <p>保存前后端会再次检查重复，单个候选失败不会影响其他候选。</p>
      </div>
      <el-tag type="success" effect="plain">保存完成</el-tag>
    </div>

    <el-descriptions :column="4" border size="small">
      <el-descriptions-item label="勾选总数">{{ result.totalSelected }}</el-descriptions-item>
      <el-descriptions-item label="已保存">{{ result.savedCount }}</el-descriptions-item>
      <el-descriptions-item label="已跳过">{{ result.skippedCount }}</el-descriptions-item>
      <el-descriptions-item label="失败">{{ result.failedCount }}</el-descriptions-item>
    </el-descriptions>

    <el-empty
      v-if="result.totalSelected === 0"
      description="本次没有提交候选词，请先勾选非重复候选。"
      class="save-result-empty"
    />

    <el-collapse
      v-if="result.savedItems.length || result.skippedItems.length || result.failedItems.length"
      class="save-result-collapse"
    >
      <el-collapse-item v-if="result.savedItems.length" title="已保存候选词" name="saved">
        <ul class="import-row-list">
          <li v-for="item in result.savedItems" :key="item.candidateId">
            {{ item.promptText }} → {{ item.geoPromptId }}
          </li>
        </ul>
      </el-collapse-item>
      <el-collapse-item v-if="result.skippedItems.length" title="跳过候选词" name="skipped">
        <ul class="import-row-list">
          <li v-for="item in result.skippedItems" :key="item.candidateId">
            {{ item.promptText ?? item.candidateId }}：{{
              skippedReasonLabelMap[item.reason] ?? item.reason
            }}
          </li>
        </ul>
      </el-collapse-item>
      <el-collapse-item v-if="result.failedItems.length" title="失败候选词" name="failed">
        <ul class="import-row-list">
          <li v-for="item in result.failedItems" :key="item.candidateId">
            {{ item.candidateId }}：{{ failedReasonLabelMap[item.reason] ?? item.reason }}
            <span v-if="item.message">（{{ item.message }}）</span>
          </li>
        </ul>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

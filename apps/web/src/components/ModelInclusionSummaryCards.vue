<script setup lang="ts">
import { computed } from "vue";
import type { ModelInclusionSummary } from "@/api/model-inclusion";
import {
  entryPointLabelMap,
  formatDisplayLabel,
  formatDistribution,
  formatRate,
  hitLevelLabelMap
} from "@/config/model-inclusion-options";

const props = defineProps<{
  summary?: ModelInclusionSummary | null;
  loading?: boolean;
}>();

const optimizationIssueCount = computed(() => {
  const notMentioned = props.summary?.notMentionedCount ?? 0;
  const competitor = props.summary?.competitorMentionedCount ?? 0;
  const unclear = props.summary?.hitLevelDistribution?.unclear ?? 0;

  return notMentioned + competitor + unclear;
});

const formatHitLevelName = (name: string) =>
  hitLevelLabelMap[name as keyof typeof hitLevelLabelMap] ?? name;

const formatEntryPointName = (name: string) =>
  entryPointLabelMap[name as keyof typeof entryPointLabelMap] ?? name;
</script>

<template>
  <el-card class="model-summary-card" shadow="never">
    <template #header>
      <div class="table-card-header">
        <div>
          <p class="section-kicker">覆盖概览</p>
          <h2>当前匹配记录概览</h2>
          <span>基于当前启用模型和当前筛选结果计算，优先看覆盖率、引用率和待优化问题。</span>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading && !summary" :rows="4" animated />
    <template v-else>
      <div class="model-summary-grid">
        <div class="model-summary-metric">
          <span>有效记录数</span>
          <strong>{{ summary?.totalRecords ?? 0 }}</strong>
        </div>
        <div class="model-summary-metric">
          <span>品牌覆盖率</span>
          <strong>{{ formatRate(summary?.brandMentionRate) }}</strong>
          <el-progress :percentage="(summary?.brandMentionRate ?? 0) * 100" :show-text="false" />
          <small>{{ summary?.mentionedCount ?? 0 }} 条提及品牌</small>
        </div>
        <div class="model-summary-metric">
          <span>官网引用率</span>
          <strong>{{ formatRate(summary?.citedOfficialSiteRate) }}</strong>
          <el-progress
            :percentage="(summary?.citedOfficialSiteRate ?? 0) * 100"
            :show-text="false"
          />
          <small>{{ summary?.citedOfficialSiteCount ?? 0 }} 条引用官网</small>
        </div>
        <div class="model-summary-metric">
          <span>待优化问题</span>
          <strong>{{ optimizationIssueCount }}</strong>
          <small>未命中、竞品占位或无法判断</small>
        </div>
      </div>

      <el-collapse class="model-distribution-collapse">
        <el-collapse-item title="展开分布统计" name="distribution">
          <div class="model-distribution-grid">
            <section>
              <h3>命中等级分布</h3>
              <p v-if="formatDistribution(summary?.hitLevelDistribution).length === 0">
                暂无命中等级记录
              </p>
              <div
                v-for="[name, count] in formatDistribution(summary?.hitLevelDistribution).slice(
                  0,
                  6
                )"
                :key="name"
                class="distribution-row"
              >
                <span>{{ formatHitLevelName(name) }}</span>
                <strong>{{ count }}</strong>
              </div>
            </section>
            <section>
              <h3>入口分布</h3>
              <p v-if="formatDistribution(summary?.entryPointDistribution).length === 0">
                暂无入口记录
              </p>
              <div
                v-for="[name, count] in formatDistribution(summary?.entryPointDistribution).slice(
                  0,
                  6
                )"
                :key="name"
                class="distribution-row"
              >
                <span>{{ formatEntryPointName(name) }}</span>
                <strong>{{ count }}</strong>
              </div>
            </section>
            <section>
              <h3>平台分布</h3>
              <p v-if="formatDistribution(summary?.platformDistribution).length === 0">
                暂无平台记录
              </p>
              <div
                v-for="[name, count] in formatDistribution(summary?.platformDistribution).slice(
                  0,
                  6
                )"
                :key="name"
                class="distribution-row"
              >
                <span>{{ formatDisplayLabel(name) }}</span>
                <strong>{{ count }}</strong>
              </div>
            </section>
            <section>
              <h3>模型分布</h3>
              <p v-if="formatDistribution(summary?.modelDistribution).length === 0">
                暂无模型记录
              </p>
              <div
                v-for="[name, count] in formatDistribution(summary?.modelDistribution).slice(0, 6)"
                :key="name"
                class="distribution-row"
              >
                <span>{{ formatDisplayLabel(name) }}</span>
                <strong>{{ count }}</strong>
              </div>
            </section>
            <section>
              <h3>产品线分布</h3>
              <p v-if="formatDistribution(summary?.productLineDistribution).length === 0">
                暂无产品线记录
              </p>
              <div
                v-for="[name, count] in formatDistribution(summary?.productLineDistribution).slice(
                  0,
                  6
                )"
                :key="name"
                class="distribution-row"
              >
                <span>{{ formatDisplayLabel(name) }}</span>
                <strong>{{ count }}</strong>
              </div>
            </section>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
  </el-card>
</template>

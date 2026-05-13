<script setup lang="ts">
import type { ModelInclusionSummary } from "@/api/model-inclusion";
import { formatDistribution, formatRate } from "@/config/model-inclusion-options";

defineProps<{
  summary?: ModelInclusionSummary | null;
  loading?: boolean;
}>();
</script>

<template>
  <el-card class="model-summary-card" shadow="never">
    <template #header>
      <div class="table-card-header">
        <div>
          <p class="section-kicker">GEO 效果汇总</p>
          <h2>模型覆盖基础统计</h2>
          <span>快速判断品牌提及、推荐和官网引用是否已有改善迹象。</span>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading && !summary" :rows="4" animated />
    <template v-else>
      <div class="model-summary-grid">
        <div class="model-summary-metric">
          <span>覆盖记录总数</span>
          <strong>{{ summary?.totalRecords ?? 0 }}</strong>
        </div>
        <div class="model-summary-metric">
          <span>品牌提及次数</span>
          <strong>{{ summary?.mentionedCount ?? 0 }}</strong>
          <el-progress :percentage="(summary?.brandMentionRate ?? 0) * 100" :show-text="false" />
          <small>{{ formatRate(summary?.brandMentionRate) }}</small>
        </div>
        <div class="model-summary-metric">
          <span>品牌推荐次数</span>
          <strong>{{ summary?.recommendedCount ?? 0 }}</strong>
          <el-progress :percentage="(summary?.brandRecommendRate ?? 0) * 100" :show-text="false" />
          <small>{{ formatRate(summary?.brandRecommendRate) }}</small>
        </div>
        <div class="model-summary-metric">
          <span>官网引用次数</span>
          <strong>{{ summary?.citedOfficialSiteCount ?? 0 }}</strong>
          <el-progress
            :percentage="(summary?.citedOfficialSiteRate ?? 0) * 100"
            :show-text="false"
          />
          <small>{{ formatRate(summary?.citedOfficialSiteRate) }}</small>
        </div>
      </div>

      <div class="model-distribution-grid">
        <section>
          <h3>模型分布</h3>
          <p v-if="formatDistribution(summary?.modelDistribution).length === 0">暂无模型记录</p>
          <div
            v-for="[name, count] in formatDistribution(summary?.modelDistribution).slice(0, 6)"
            :key="name"
            class="distribution-row"
          >
            <span>{{ name }}</span>
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
            <span>{{ name }}</span>
            <strong>{{ count }}</strong>
          </div>
        </section>
      </div>
    </template>
  </el-card>
</template>

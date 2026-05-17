<script setup lang="ts">
import { formatGeoAnalysisDisplayText } from "@/config/geo-analysis-options";

defineProps<{
  title: string;
  description: string;
  emptyText: string;
  gaps: string[];
  type?: "content" | "knowledge";
}>();
</script>

<template>
  <el-card shadow="never" class="analysis-gap-card">
    <template #header>
      <div class="gap-card-header">
        <div>
          <p class="section-kicker">
            {{ type === "knowledge" ? "知识库缺口" : "内容缺口" }}
          </p>
          <h3>{{ title }}</h3>
          <p>{{ description }}</p>
        </div>
      </div>
    </template>

    <div v-if="gaps.length > 0" class="gap-list">
      <div v-for="(gap, index) in gaps" :key="`${gap}-${index}`" class="gap-item">
        <span class="gap-index">{{ index + 1 }}</span>
        <span>{{ formatGeoAnalysisDisplayText(gap, gap) }}</span>
      </div>
    </div>
    <el-empty v-else :description="emptyText" />
  </el-card>
</template>

<style scoped>
.gap-card-header h3 {
  margin: 4px 0;
  color: #1f2937;
}

.gap-card-header p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.gap-list {
  display: grid;
  gap: 10px;
}

.gap-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  line-height: 1.6;
}

.gap-index {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0f766e;
  color: #ffffff;
  font-size: 12px;
}
</style>

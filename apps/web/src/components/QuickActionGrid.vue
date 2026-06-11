<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";
import {
  CollectionTag,
  DocumentChecked,
  EditPen,
  Files,
  TrendCharts
} from "@element-plus/icons-vue";

type QuickAction = {
  title: string;
  description: string;
  to: string;
  icon: Component;
};

const actions: QuickAction[] = [
  {
    title: "补真实问法",
    description: "维护用户会如何向 AI 提问。",
    to: "/geo-prompts",
    icon: CollectionTag
  },
  {
    title: "补可引用证据",
    description: "补产品、场景、参数和案例资料。",
    to: "/knowledge-bases",
    icon: Files
  },
  {
    title: "优化发布文章",
    description: "检查首段、FAQ、参数和资料依据。",
    to: "/geo-content",
    icon: EditPen
  },
  {
    title: "复盘模型覆盖",
    description: "查看提及、推荐、引用和未推荐原因。",
    to: "/model-inclusion-records",
    icon: TrendCharts
  },
  {
    title: "查看证据链",
    description: "看哪些问题缺证据、文章或引用来源。",
    to: "/evidence-citations",
    icon: DocumentChecked
  }
];
</script>

<template>
  <div class="dashboard-refresh-quick-action-grid">
    <RouterLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="dashboard-refresh-quick-action"
    >
      <el-icon>
        <component :is="action.icon" />
      </el-icon>
      <span>
        <strong>{{ action.title }}</strong>
        <small>{{ action.description }}</small>
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.dashboard-refresh-quick-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.dashboard-refresh-quick-action {
  display: grid;
  gap: 10px;
  min-height: 92px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.16s ease,
    background 0.16s ease;
}

.dashboard-refresh-quick-action:hover {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.dashboard-refresh-quick-action .el-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 6px;
  background: #f0f5ff;
  color: #0070f3;
  font-size: 16px;
}

.dashboard-refresh-quick-action span {
  display: grid;
  gap: 6px;
}

.dashboard-refresh-quick-action strong {
  color: #111827;
  font-size: 15px;
  line-height: 1.35;
}

.dashboard-refresh-quick-action small {
  color: #5d6f86;
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1280px) {
  .dashboard-refresh-quick-action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-refresh-quick-action-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";
import {
  EditPen,
  Files,
  MagicStick,
  PieChart,
  Search,
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
    title: "新建 GEO 诊断",
    description: "从品牌、官网或产品线开始定位缺口。",
    to: "/geo-analysis",
    icon: Search
  },
  {
    title: "AI 拓词",
    description: "扩展适合追踪和生产内容的问题词。",
    to: "/expansion",
    icon: MagicStick
  },
  {
    title: "上传资料",
    description: "补充产品、FAQ、案例和选型边界。",
    to: "/knowledge-bases",
    icon: Files
  },
  {
    title: "新建文章",
    description: "进入发布文章工作台生成发布稿。",
    to: "/geo-content",
    icon: EditPen
  },
  {
    title: "查看 GEO 报表",
    description: "复盘提示词、内容、知识库和模型覆盖。",
    to: "/geo-reports",
    icon: PieChart
  },
  {
    title: "模型覆盖记录",
    description: "补录 AI 平台提及、推荐和引用情况。",
    to: "/model-inclusion-records",
    icon: TrendCharts
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.dashboard-refresh-quick-action {
  display: grid;
  gap: 12px;
  min-height: 132px;
  padding: 16px;
  border: 1px solid #dfe7f1;
  border-radius: 16px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.dashboard-refresh-quick-action:hover {
  border-color: #bfd2f6;
  box-shadow: 0 14px 34px rgb(15 23 42 / 7%);
  transform: translateY(-1px);
}

.dashboard-refresh-quick-action .el-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: #f0f5ff;
  color: #315dff;
  font-size: 17px;
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
  line-height: 1.5;
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

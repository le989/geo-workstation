<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";
import {
  CollectionTag,
  EditPen,
  Files,
  PieChart
} from "@element-plus/icons-vue";

type QuickAction = {
  title: string;
  description: string;
  to: string;
  icon: Component;
};

const actions: QuickAction[] = [
  {
    title: "生成 GEO 内容",
    description: "围绕提示词和知识库补齐内容资产。",
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
    title: "进入知识库",
    description: "沉淀 AI 应该引用的企业事实资料。",
    to: "/knowledge-bases",
    icon: Files
  },
  {
    title: "提示词策略库",
    description: "补充训练词、蒸馏词、品牌词和场景词。",
    to: "/geo-prompts",
    icon: CollectionTag
  }
];
</script>

<template>
  <div class="dashboard-quick-action-grid">
    <RouterLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      class="dashboard-quick-action"
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

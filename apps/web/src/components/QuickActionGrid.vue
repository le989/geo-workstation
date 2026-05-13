<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";
import {
  CollectionTag,
  DocumentChecked,
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
    title: "新建 GEO 分析",
    description: "从品牌、官网和产品线开始诊断 AI 回答表现。",
    to: "/geo-analysis",
    icon: Search
  },
  {
    title: "导入提示词",
    description: "补充训练词、蒸馏词、品牌词和场景词。",
    to: "/geo-prompts",
    icon: CollectionTag
  },
  {
    title: "AI 拓词",
    description: "用规则或 AI 接口生成可筛选的候选提示词。",
    to: "/expansion",
    icon: MagicStick
  },
  {
    title: "建知识库",
    description: "沉淀 AI 应该引用的企业事实资料。",
    to: "/knowledge-bases",
    icon: Files
  },
  {
    title: "创建指令模板",
    description: "沉淀适合 GEO 内容生产的方法。",
    to: "/instruction-templates",
    icon: DocumentChecked
  },
  {
    title: "生成 GEO 内容",
    description: "围绕提示词和知识库补齐内容资产。",
    to: "/content-tasks",
    icon: EditPen
  },
  {
    title: "录入模型覆盖记录",
    description: "记录品牌是否被 AI 提及、推荐和引用。",
    to: "/model-inclusion-records",
    icon: TrendCharts
  },
  {
    title: "查看 GEO 报表",
    description: "复盘提示词、内容、知识库和模型覆盖。",
    to: "/reports",
    icon: PieChart
  }
];
</script>

<template>
  <div class="quick-action-grid">
    <RouterLink v-for="action in actions" :key="action.to" :to="action.to" class="quick-action">
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

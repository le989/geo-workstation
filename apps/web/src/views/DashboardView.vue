<script setup lang="ts">
import AppErrorState from "@/components/AppErrorState.vue";
import AppLoadingState from "@/components/AppLoadingState.vue";
import GeoPageShell from "@/components/GeoPageShell.vue";
import { pageMetaByPath } from "@/config/navigation";
import { useAppStore } from "@/stores/app";

const page = pageMetaByPath["/dashboard"];
const appStore = useAppStore();

const loopNodes = [
  { label: "GEO 诊断", value: "分析品牌在 AI 回答中的表现" },
  { label: "提示词策略", value: "沉淀用户会问 AI 的问题资产" },
  { label: "企业知识库", value: "组织 AI 应该引用的事实资料" },
  { label: "内容生成", value: "生产服务 AI 摘取和推荐的内容" },
  { label: "效果记录", value: "记录模型提及、推荐和引用情况" },
  { label: "优化建议", value: "决定下一步补词、补资料或补内容" }
];
</script>

<template>
  <GeoPageShell
    :title="page.title"
    :label="page.label"
    :question="page.question"
    :description="page.description"
    :phase-note="page.phaseNote"
    :next-steps="page.nextSteps"
    :api-focus="page.apiFocus"
    :icon="page.icon"
  >
    <template #aside>
      <p class="panel-copy">API Base URL：{{ appStore.apiBaseUrl }}</p>
    </template>

    <section class="loop-section">
      <p class="section-kicker">GEO 运营闭环</p>
      <div class="loop-grid">
        <article v-for="node in loopNodes" :key="node.label" class="loop-node">
          <strong>{{ node.label }}</strong>
          <span>{{ node.value }}</span>
        </article>
      </div>
    </section>

    <section class="status-grid">
      <AppLoadingState title="后续总览指标加载状态" />
      <AppErrorState
        title="后端健康状态未实时检查"
        message="Phase 3A 只提供健康状态入口，后续页面再接入实时请求。"
      />
    </section>
  </GeoPageShell>
</template>

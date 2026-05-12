<script setup lang="ts">
import type { Component } from "vue";
import AppEmptyState from "./AppEmptyState.vue";

defineProps<{
  title: string;
  label: string;
  question: string;
  description: string;
  phaseNote: string;
  nextSteps: string[];
  apiFocus: string;
  icon: Component;
}>();
</script>

<template>
  <section class="page-shell">
    <header class="page-heading">
      <div class="heading-icon">
        <el-icon>
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="heading-copy">
        <el-tag size="small" effect="plain" type="success">
          {{ label }}
        </el-tag>
        <h1>{{ title }}</h1>
        <p class="page-question">{{ question }}</p>
        <p class="page-description">{{ description }}</p>
      </div>
    </header>

    <section class="phase-band">
      <div>
        <p class="section-kicker">当前阶段</p>
        <p>{{ phaseNote }}</p>
      </div>
      <el-tag effect="dark" type="info"> Phase 3A </el-tag>
    </section>

    <section class="content-grid">
      <div class="panel">
        <p class="section-kicker">后续业务入口</p>
        <ul class="next-list">
          <li v-for="step in nextSteps" :key="step">
            {{ step }}
          </li>
        </ul>
      </div>

      <div class="panel">
        <p class="section-kicker">API 联调范围</p>
        <p class="panel-copy">{{ apiFocus }}</p>
        <slot name="aside" />
      </div>
    </section>

    <AppEmptyState title="业务页面尚未展开" :description="`${title} 将在后续阶段接入后端 API。`" />

    <slot />
  </section>
</template>

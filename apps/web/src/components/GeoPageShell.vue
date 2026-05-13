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
        <p class="section-kicker">当前能力</p>
        <p>{{ phaseNote }}</p>
      </div>
      <el-tag effect="plain" type="success">已接入基础配置说明</el-tag>
    </section>

    <section class="content-grid">
      <div class="panel">
        <p class="section-kicker">推荐操作</p>
        <ul class="next-list">
          <li v-for="step in nextSteps" :key="step">
            {{ step }}
          </li>
        </ul>
      </div>

      <div class="panel">
        <p class="section-kicker">接口与配置范围</p>
        <p class="panel-copy">{{ apiFocus }}</p>
        <slot name="aside" />
      </div>
    </section>

    <AppEmptyState
      title="当前页面以配置说明为主"
      :description="`${title} 暂不保存密钥或团队配置，关键配置仍由后端环境变量管理。`"
    />

    <slot />
  </section>
</template>

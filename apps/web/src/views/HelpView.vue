<script setup lang="ts">
import { Guide } from "@element-plus/icons-vue";
import { helpNavItems, quickStartSteps, sopSections } from "@/config/help-content";

const helpOverviewItems = [
  {
    title: "新手快速开始",
    text: "先看 Dashboard，再按待处理事项补资料、文章和覆盖记录。"
  },
  {
    title: "日常 GEO 运营",
    text: "按问法、证据、文章、模型覆盖和复盘推进。"
  },
  {
    title: "风险边界清楚",
    text: "真实 AI、保存和系统设置操作前先确认环境。"
  }
];
</script>

<template>
  <main class="help-page">
    <section class="help-hero">
      <div class="help-hero__copy">
        <el-tag effect="plain" type="primary">帮助中心</el-tag>
        <h1>使用教程与操作边界</h1>
      </div>
      <div class="help-hero__aside">
        <el-icon>
          <Guide />
        </el-icon>
        <strong>快速查找操作边界</strong>
      </div>
    </section>

    <section class="help-overview-grid" aria-label="帮助中心概览">
      <article v-for="item in helpOverviewItems" :key="item.title" class="help-overview-card">
        <strong>{{ item.title }}</strong>
        <span>{{ item.text }}</span>
      </article>
    </section>

    <section class="help-layout">
      <aside class="help-nav">
        <p class="section-kicker">目录</p>
        <a v-for="item in helpNavItems" :key="item.id" :href="`#${item.id}`">
          {{ item.title }}
        </a>
      </aside>

      <div class="help-content">
        <section id="quick-start" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">Quick Start</p>
              <h2>新手快速开始</h2>
            </div>
            <el-tag type="primary" effect="plain">建议从这里开始</el-tag>
          </div>

          <el-alert
            title="AI 结果需要人工复核，发布文章需要人工发布。"
            type="info"
            show-icon
            :closable="false"
            class="help-alert"
          />

          <ol class="help-quickstart-grid">
            <li v-for="step in quickStartSteps" :key="step.title">
              <strong>{{ step.title }}</strong>
              <span>{{ step.description }}</span>
            </li>
          </ol>
        </section>

        <section id="sop-loop" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">Guide Map</p>
              <h2>帮助目录总览</h2>
            </div>
            <el-tag effect="plain">{{ sopSections.length }} 组说明</el-tag>
          </div>
          <div class="help-sop-card-grid">
            <article v-for="section in sopSections" :key="section.id">
              <p class="section-kicker">{{ section.kicker }}</p>
              <h3>{{ section.title }}</h3>
              <span>{{ section.summary }}</span>
              <a :href="`#${section.id}`">查看说明</a>
            </article>
          </div>
        </section>

        <details
          v-for="section in sopSections"
          :id="section.id"
          :key="section.id"
          class="help-section help-section--sop-detail"
        >
          <summary class="help-section-summary">
            <div>
              <p class="section-kicker">{{ section.kicker }}</p>
              <h2>{{ section.title }}</h2>
              <span>{{ section.summary }}</span>
            </div>
            <el-tag effect="plain">{{ section.steps.length }} 项</el-tag>
          </summary>

          <ol class="help-step-list">
            <li v-for="step in section.steps" :key="step.title">
              <strong>{{ step.title }}</strong>
              <span>{{ step.description }}</span>
            </li>
          </ol>

          <div class="help-reminder-grid">
            <el-alert
              v-for="reminder in section.reminders"
              :key="reminder"
              :title="reminder"
              type="warning"
              show-icon
              :closable="false"
            />
          </div>

          <div v-if="section.pendingNotes?.length" class="help-pending-list">
            <el-alert
              v-for="note in section.pendingNotes"
              :key="note"
              :title="note"
              type="info"
              show-icon
              :closable="false"
            />
          </div>
        </details>
      </div>
    </section>
  </main>
</template>

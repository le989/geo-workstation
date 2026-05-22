<script setup lang="ts">
import { computed } from "vue";
import { Guide } from "@element-plus/icons-vue";
import { helpNavItems, quickStartSteps, sopSections, versionNotes } from "@/config/help-content";

const totalSopSteps = computed(() =>
  sopSections.reduce((total, section) => total + section.steps.length, 0)
);

const helpOverviewItems = [
  {
    title: "普通用户快速上手",
    text: "从 Dashboard 看缺口，再维护提示词、知识库、指令库、内容任务和模型覆盖记录。"
  },
  {
    title: "从 0 搭建正式数据",
    text: "按确认公司、维护产品线、建提示词、建知识库、建指令模板、建内容任务的顺序推进。"
  },
  {
    title: "管理员维护重点",
    text: "平台管理员和公司管理员负责公司、产品线、用户、权限和基础数据边界。"
  }
];
</script>

<template>
  <main class="help-page">
    <section class="help-hero">
      <div class="help-hero__copy">
        <el-tag effect="plain" type="success">帮助中心</el-tag>
        <h1>使用教程</h1>
        <p>
          查看 GEO 工作站的快速开始、从 0 搭建正式数据、日常 SOP、管理员维护重点和当前注意事项。
        </p>
      </div>
      <div class="help-hero__aside">
        <el-icon>
          <Guide />
        </el-icon>
        <strong>{{ helpNavItems.length }} 个说明板块</strong>
        <span>{{ totalSopSteps }} 个操作步骤，覆盖正式数据搭建、内容生产、管理员维护和复盘。</span>
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
              <h2>快速开始</h2>
              <span>第一次使用时按这条线走，先完成一条正式公司数据和 GEO 内容闭环。</span>
            </div>
            <el-tag type="success" effect="plain">建议从这里开始</el-tag>
          </div>

          <el-alert
            title="先确认公司和产品线，再扩大提示词、知识库和内容规模。"
            type="info"
            show-icon
            :closable="false"
            class="help-alert"
          />

          <el-steps direction="vertical" :active="quickStartSteps.length" finish-status="success">
            <el-step
              v-for="step in quickStartSteps"
              :key="step.title"
              :title="step.title"
              :description="step.description"
            />
          </el-steps>
        </section>

        <section id="sop-loop" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">SOP</p>
              <h2>正式使用流程总览</h2>
              <span>围绕公司、产品线、提示词、知识库、指令库、内容、覆盖记录和报表，把日常动作拆成可交接流程。</span>
            </div>
            <el-tag effect="plain">{{ sopSections.length }} 组 SOP</el-tag>
          </div>
          <div class="help-sop-card-grid">
            <article v-for="section in sopSections" :key="section.id">
              <p class="section-kicker">{{ section.steps.length }} 步</p>
              <h3>{{ section.title }}</h3>
              <span>{{ section.summary }}</span>
              <a :href="`#${section.id}`">查看步骤</a>
            </article>
          </div>
        </section>

        <section
          v-for="section in sopSections"
          :id="section.id"
          :key="section.id"
          class="help-section help-section--sop-detail"
        >
          <div class="help-section__header">
            <div>
              <p class="section-kicker">SOP</p>
              <h2>{{ section.title }}</h2>
              <span>{{ section.summary }}</span>
            </div>
            <el-tag effect="plain">{{ section.steps.length }} 步</el-tag>
          </div>

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
        </section>

        <section id="version-log" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">Changelog</p>
              <h2>版本更新记录</h2>
              <span>这里记录当前正式入口、基础管理、任务归档和数据初始化口径，便于内部演示和交接。</span>
            </div>
            <el-tag type="info" effect="plain">版本说明</el-tag>
          </div>

          <el-timeline class="help-version-timeline">
            <el-timeline-item
              v-for="version in versionNotes"
              :key="version.name"
              :timestamp="version.name"
              placement="top"
            >
              <div class="help-version-card">
                <div>
                  <p class="section-kicker">主要能力</p>
                  <ul>
                    <li v-for="item in version.capabilities" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div>
                  <p class="section-kicker">适合用途</p>
                  <p>{{ version.usage }}</p>
                </div>
                <div>
                  <p class="section-kicker">注意事项</p>
                  <p>{{ version.notes }}</p>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </section>
      </div>
    </section>
  </main>
</template>

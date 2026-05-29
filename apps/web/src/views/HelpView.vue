<script setup lang="ts">
import { computed } from "vue";
import { Guide } from "@element-plus/icons-vue";
import { helpNavItems, quickStartSteps, sopSections, versionNotes } from "@/config/help-content";

const totalSopSteps = computed(() =>
  sopSections.reduce((total, section) => total + section.steps.length, 0)
);

const helpOverviewItems = [
  {
    title: "新手快速开始",
    text: "先看 Dashboard 待处理事项，再补提示词、知识库和发布稿。"
  },
  {
    title: "日常 GEO 运营",
    text: "按诊断、拓词、补资料、生成发布稿、人工发布和报表复盘推进。"
  },
  {
    title: "风险边界清楚",
    text: "真实 AI、候选保存、反馈处理和系统设置保存都要先确认环境。"
  }
];
</script>

<template>
  <main class="help-page">
    <section class="help-hero">
      <div class="help-hero__copy">
        <el-tag effect="plain" type="primary">帮助中心</el-tag>
        <h1>使用教程与操作边界</h1>
        <p>
          面向内部员工整理当前 GEO 工作站的日常运营流程、模块说明、高风险操作提醒和管理员设置边界。
        </p>
      </div>
      <div class="help-hero__aside">
        <el-icon>
          <Guide />
        </el-icon>
        <strong>{{ helpNavItems.length }} 个帮助板块</strong>
        <span>{{ totalSopSteps }} 条说明，覆盖 Dashboard、发布文章工作台、AI 拓词、售后问答和系统设置。</span>
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
              <span>第一次使用时先看 Dashboard，再按待处理事项补资料、做诊断、生成发布稿和复盘。</span>
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

          <el-steps direction="vertical" :active="quickStartSteps.length" finish-status="process">
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
              <p class="section-kicker">Guide Map</p>
              <h2>帮助目录总览</h2>
              <span>按员工日常任务组织，先看流程，再查模块、风险、常见问题、术语和管理员设置。</span>
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

        <section
          v-for="section in sopSections"
          :id="section.id"
          :key="section.id"
          class="help-section help-section--sop-detail"
        >
          <div class="help-section__header">
            <div>
              <p class="section-kicker">{{ section.kicker }}</p>
              <h2>{{ section.title }}</h2>
              <span>{{ section.summary }}</span>
            </div>
            <el-tag effect="plain">{{ section.steps.length }} 项</el-tag>
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
              <span>这里记录当前帮助页口径、发布文章工作台说明和关键操作边界，便于内部培训和交接。</span>
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

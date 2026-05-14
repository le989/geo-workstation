<script setup lang="ts">
import { computed } from "vue";
import { Guide } from "@element-plus/icons-vue";
import { helpNavItems, quickStartSteps, sopSections, versionNotes } from "@/config/help-content";

const totalSopSteps = computed(() =>
  sopSections.reduce((total, section) => total + section.steps.length, 0)
);
</script>

<template>
  <main class="help-page">
    <section class="help-hero">
      <div class="help-hero__copy">
        <el-tag effect="plain" type="success">Help-1</el-tag>
        <h1>使用教程</h1>
        <p>
          查看 GEO 工作站的快速开始、日常
          SOP、功能说明和版本更新记录。这里写给长期自用和交接演示，不写成开发文档。
        </p>
      </div>
      <div class="help-hero__aside">
        <el-icon>
          <Guide />
        </el-icon>
        <strong>{{ helpNavItems.length }} 个说明板块</strong>
        <span>{{ totalSopSteps }} 个 SOP 操作步骤，覆盖初始化、生产、拓词、知识库和复盘。</span>
      </div>
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
              <span>第一次使用时按这条线走，先完成一条最小 GEO 内容闭环。</span>
            </div>
            <el-tag type="success" effect="plain">建议从这里开始</el-tag>
          </div>

          <el-alert
            title="先跑通一篇内容，再扩大提示词和知识库规模。"
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

        <section
          v-for="section in sopSections"
          :id="section.id"
          :key="section.id"
          class="help-section"
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
              <span>这些版本名仅作为说明记录；如果本地没有对应 tag，不需要强行创建。</span>
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

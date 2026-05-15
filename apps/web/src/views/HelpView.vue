<script setup lang="ts">
import { computed } from "vue";
import { Guide } from "@element-plus/icons-vue";
import { quickStartSteps, sopSections, versionNotes } from "@/config/help-content";

const totalSopSteps = computed(() =>
  sopSections.reduce((total, section) => total + section.steps.length, 0)
);

const supportNavItems = [
  { id: "quick-start", title: "快速开始" },
  { id: "sop-loop", title: "GEO 运营闭环 SOP" },
  { id: "page-features", title: "页面功能说明" },
  { id: "publish-review", title: "发布与复测流程" },
  { id: "capability-boundary", title: "能力边界" },
  { id: "version-log", title: "版本更新" }
];

const helpOverviewItems = [
  {
    title: "快速开始",
    text: "先跑通一条最小 GEO 内容闭环，再扩大提示词、知识库和内容规模。"
  },
  {
    title: "运营 SOP",
    text: "把诊断、策略、资产、生产、检测和复盘拆成可交接步骤。"
  },
  {
    title: "能力边界",
    text: "明确联网检测、内容发布、测试数据和人工确认的边界。"
  }
];

const pageFeatureItems = [
  {
    title: "工作台",
    text: "今日动作、核心数据、待处理队列和快捷入口。"
  },
  {
    title: "诊断 / 策略 / 拓词",
    text: "前期发现问题、沉淀 GEO 词资产并扩展候选问题。"
  },
  {
    title: "知识库 / 指令库",
    text: "维护企业事实资料、内容方法、品牌锚点和事实边界。"
  },
  {
    title: "内容生成",
    text: "从任务创建到生成、质检、发布优化和富文本稿。"
  },
  {
    title: "模型覆盖 / 报表",
    text: "记录原始检测台账，并在报表里做汇总复盘。"
  },
  {
    title: "设置 / 使用教程",
    text: "维护项目档案，查看 SOP、版本更新和交接说明。"
  }
];

const capabilityBoundaryItems = [
  "联网 Provider 结果不等同于 App 端真实用户结果。",
  "发布内容和参数事实仍需人工确认。",
  "测试数据后续 Clean-Final 阶段统一清理。",
  "当前系统适合作为人工协同型 GEO 内容工作站。"
];
const pageFeatureSummary =
  "每个页面只负责 GEO 闭环中的一个环节，避免把内容生产、检测台账和报表复盘混在一起。";
const capabilityBoundarySummary =
  "这里保留系统使用边界，避免把辅助工作站误解为全自动发布或真实用户结果替代。";

const publishReviewSteps = [
  "发布前先完成质量检查，处理未证实参数、认证、协议和效果承诺。",
  "生成发布优化版与富文本发布稿后，仍由人工复制到官网、公众号、B2B 页面或销售资料。",
  "发布后记录链接和检测结果，再回到模型覆盖记录与 GEO 报表做复盘。"
];
</script>

<template>
  <main class="help-page">
    <section class="help-hero">
      <div class="help-hero__copy">
        <el-tag effect="plain" type="success">帮助中心</el-tag>
        <h1>使用教程</h1>
        <p>查看 GEO 工作站的快速开始、操作 SOP、页面功能说明、版本更新和能力边界说明。</p>
      </div>
      <div class="help-hero__aside">
        <el-icon>
          <Guide />
        </el-icon>
        <strong>{{ supportNavItems.length }} 个说明板块</strong>
        <span>{{ totalSopSteps }} 个 SOP 操作步骤，覆盖初始化、生产、拓词、知识库和复盘。</span>
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
        <a v-for="item in supportNavItems" :key="item.id" :href="`#${item.id}`">
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

        <section id="sop-loop" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">SOP</p>
              <h2>GEO 运营闭环 SOP</h2>
              <span>围绕诊断、策略、资产、生产、追踪和复盘，把日常运营动作拆成可交接流程。</span>
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

        <section id="page-features" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">功能地图</p>
              <h2>页面功能说明</h2>
              <span>{{ pageFeatureSummary }}</span>
            </div>
            <el-tag effect="plain">按页面理解</el-tag>
          </div>
          <div class="help-feature-grid">
            <article v-for="item in pageFeatureItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <span>{{ item.text }}</span>
            </article>
          </div>
        </section>

        <section id="publish-review" class="help-section">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">发布复测</p>
              <h2>发布与复测流程</h2>
              <span>发布稿只是可复制材料，真实发布、事实确认和效果复盘仍需要运营人工完成。</span>
            </div>
            <el-tag type="warning" effect="plain">人工确认</el-tag>
          </div>
          <ol class="help-step-list help-step-list--compact">
            <li v-for="step in publishReviewSteps" :key="step">
              <strong>{{ step }}</strong>
              <span>完成后再进入模型覆盖记录或 GEO 报表查看复盘结果。</span>
            </li>
          </ol>
        </section>

        <section id="capability-boundary" class="help-section help-section--boundary">
          <div class="help-section__header">
            <div>
              <p class="section-kicker">边界说明</p>
              <h2>能力边界</h2>
              <span>{{ capabilityBoundarySummary }}</span>
            </div>
            <el-tag type="info" effect="plain">必须保留</el-tag>
          </div>
          <div class="help-boundary-grid">
            <article v-for="item in capabilityBoundaryItems" :key="item">
              <strong>{{ item }}</strong>
            </article>
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

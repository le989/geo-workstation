<script setup lang="ts">
import type { Component } from "vue";
import {
  ChatDotRound,
  DataBoard,
  EditPen,
  Files,
  MagicStick,
  OfficeBuilding,
  PieChart,
  Search,
  Setting,
  TrendCharts,
  User
} from "@element-plus/icons-vue";

type LandingCapability = {
  title: string;
  description: string;
  icon: Component;
  tone: "blue" | "cyan" | "green" | "amber";
};

type LandingWorkflowStep = {
  title: string;
  description: string;
};

const heroIndicators = [
  { label: "品牌提及率", value: "30.3%", caption: "示例运营指标" },
  { label: "品牌推荐率", value: "18.6%", caption: "示例运营指标" },
  { label: "官网引用率", value: "14.6%", caption: "示例运营指标" },
  { label: "未覆盖问题", value: "28", caption: "示例待处理量" }
];

const previewTasks = [
  { title: "待补检测词", count: "28", status: "高优先级" },
  { title: "待优化内容", count: "12", status: "需复盘" },
  { title: "知识库缺口", count: "6", status: "待补资料" }
];

const workflowSteps: LandingWorkflowStep[] = [
  { title: "GEO 诊断", description: "先看品牌、官网和产品线在 AI 回答里的缺口。" },
  { title: "AI 拓词", description: "把用户会问的问题扩展成可追踪的提示词资产。" },
  { title: "企业知识库", description: "沉淀产品、案例、FAQ 和选型边界，给内容生成提供事实底座。" },
  { title: "发布文章工作台", description: "围绕缺口生成发布稿，复制前保留人工检查。" },
  { title: "模型覆盖记录", description: "记录豆包、通义、Kimi 等模型是否提及、推荐和引用官网。" },
  { title: "报表复盘", description: "用推荐率、引用率和未覆盖问题决定下一轮优化顺序。" }
];

const capabilityCards: LandingCapability[] = [
  {
    title: "GEO 诊断",
    description: "定位品牌未被提及、竞品占位和知识资料不足的问题。",
    icon: Search,
    tone: "blue"
  },
  {
    title: "AI 拓词",
    description: "按产品、场景和用户意图扩展可保存的 GEO 提示词。",
    icon: MagicStick,
    tone: "cyan"
  },
  {
    title: "企业知识库",
    description: "把产品参数、案例、FAQ 和资质整理成可引用资料。",
    icon: Files,
    tone: "green"
  },
  {
    title: "发布文章工作台",
    description: "围绕缺口生成发布稿，复制前保留人工检查。",
    icon: EditPen,
    tone: "amber"
  },
  {
    title: "模型覆盖记录",
    description: "记录不同模型下的提及、推荐、引用和排名表现。",
    icon: TrendCharts,
    tone: "blue"
  },
  {
    title: "GEO 报表",
    description: "汇总提示词覆盖、内容资产、模型表现和优化建议。",
    icon: PieChart,
    tone: "cyan"
  },
  {
    title: "售后 AI 问答",
    description: "用已审核知识库回答内部售后问题，保留引用来源。",
    icon: ChatDotRound,
    tone: "green"
  },
  {
    title: "系统设置",
    description: "维护公司、产品线、项目档案和 AI 使用边界。",
    icon: Setting,
    tone: "amber"
  }
];

const teamCards = [
  { title: "新媒体运营", description: "看未覆盖问题，生成和复盘可发布内容。", icon: DataBoard },
  { title: "销售团队", description: "查产品优势、场景问答和竞品对比资料。", icon: User },
  { title: "售后团队", description: "基于知识库回答常见问题，沉淀反馈缺口。", icon: ChatDotRound },
  { title: "管理层", description: "看推荐率、引用率、内容产出和待优化事项。", icon: OfficeBuilding }
];

const safetyNotes = [
  "AI 生成内容需人工确认后发布",
  "Provider 结果不等同于真实用户结果",
  "密钥与环境变量不在前端展示",
  "知识库资料区分可靠程度和 AI 可引用状态"
];
</script>

<template>
  <main class="landing-refresh-page">
    <nav class="landing-refresh-nav" aria-label="产品首页导航">
      <RouterLink class="landing-refresh-brand" to="/">
        <span class="landing-refresh-brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        GEO 工作站
      </RouterLink>
      <div class="landing-refresh-nav-links">
        <a href="#capabilities">产品能力</a>
        <a href="#workflow">工作流程</a>
        <a href="#safety">安全边界</a>
        <a href="#teams">帮助中心</a>
      </div>
      <div class="landing-refresh-nav-actions">
        <RouterLink class="landing-refresh-login-link" to="/login">登录</RouterLink>
        <RouterLink class="landing-refresh-nav-button" to="/login">进入工作站</RouterLink>
      </div>
    </nav>

    <section class="landing-refresh-hero">
      <div class="landing-refresh-hero-copy">
        <p class="landing-refresh-eyebrow">企业 AI 搜索曝光与内容运营中枢</p>
        <h1>
          <span class="landing-refresh-title-line">让品牌在 AI 回答中</span>
          <span>被看见、被信任、被引用</span>
        </h1>
        <p class="landing-refresh-hero-lede">
          覆盖 GEO 诊断、AI 拓词、企业知识库、发布文章工作台、模型覆盖记录与报表复盘，
          帮助企业持续优化 AI 平台中的品牌表现。
        </p>
        <div class="landing-refresh-hero-actions">
          <RouterLink class="landing-refresh-primary-button" to="/login">进入工作站</RouterLink>
          <a class="landing-refresh-secondary-button" href="#workflow">查看 GEO 闭环</a>
        </div>
        <div class="landing-refresh-boundary-tags" aria-label="产品边界">
          <span>人工复核</span>
          <span>示例数据标注</span>
          <span>安全边界明确</span>
          <span>Provider 边界清晰</span>
        </div>
      </div>

      <section class="landing-refresh-product-preview" aria-label="GEO 工作站 Dashboard 预览">
        <div class="landing-refresh-preview-topbar">
          <div>
            <strong>GEO 运营工作台</strong>
            <span>近 30 天品牌表现</span>
          </div>
          <small>示例预览</small>
        </div>

        <div class="landing-refresh-preview-kpis">
          <article v-for="indicator in heroIndicators.slice(0, 3)" :key="indicator.label">
            <span>{{ indicator.label }}</span>
            <strong>{{ indicator.value }}</strong>
          </article>
        </div>

        <div class="landing-refresh-preview-main">
          <div class="landing-refresh-preview-chart">
            <div class="landing-refresh-preview-card-title">
              <span>品牌表现趋势</span>
              <small>示例趋势</small>
            </div>
            <svg viewBox="0 0 520 210" role="img" aria-label="品牌提及率、推荐率和官网引用率示例趋势">
              <path class="landing-refresh-grid-line" d="M20 38H500" />
              <path class="landing-refresh-grid-line" d="M20 88H500" />
              <path class="landing-refresh-grid-line" d="M20 138H500" />
              <path class="landing-refresh-chart-line landing-refresh-chart-line--mention" d="M22 156C92 132 122 120 180 102C250 80 312 92 370 58C420 31 462 44 500 28" />
              <path class="landing-refresh-chart-line landing-refresh-chart-line--recommend" d="M22 174C82 162 122 144 178 136C246 126 304 112 372 88C424 70 462 76 500 58" />
              <path class="landing-refresh-chart-line landing-refresh-chart-line--cite" d="M22 184C90 178 130 166 184 152C252 136 304 142 370 116C426 94 462 100 500 82" />
            </svg>
          </div>

          <div class="landing-refresh-preview-donut-card">
            <div class="landing-refresh-preview-card-title">
              <span>模型覆盖</span>
              <small>示例分布</small>
            </div>
            <div class="landing-refresh-preview-donut" aria-hidden="true">
              <span>4</span>
              <small>模型</small>
            </div>
            <ul>
              <li><span />豆包</li>
              <li><span />通义</li>
              <li><span />Kimi</li>
            </ul>
          </div>
        </div>

        <div class="landing-refresh-preview-tasks">
          <article v-for="task in previewTasks" :key="task.title">
            <span>{{ task.title }}</span>
            <strong>{{ task.count }}</strong>
            <small>{{ task.status }}</small>
          </article>
        </div>
      </section>
    </section>

    <section class="landing-refresh-metrics" aria-label="首页示例运营指标">
      <div class="landing-refresh-section-heading">
        <p>示例运营指标</p>
        <h2>用清楚的数据判断下一步优化重点</h2>
        <span>用于说明系统可观察的数据类型，实际结果以企业账号数据为准。</span>
      </div>
      <div class="landing-refresh-metric-grid">
        <article v-for="indicator in heroIndicators" :key="indicator.label">
          <span>{{ indicator.label }}</span>
          <strong>{{ indicator.value }}</strong>
          <small>{{ indicator.caption }}</small>
        </article>
      </div>
    </section>

    <section id="workflow" class="landing-refresh-workflow">
      <div class="landing-refresh-section-heading">
        <p>GEO 运营闭环</p>
        <h2>从诊断到复盘，形成可执行的日常工作流</h2>
      </div>
      <div class="landing-refresh-workflow-grid">
        <article v-for="(step, index) in workflowSteps" :key="step.title">
          <span>{{ String(index + 1).padStart(2, "0") }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section id="capabilities" class="landing-refresh-capabilities">
      <div class="landing-refresh-section-heading">
        <p>核心能力</p>
        <h2>把 GEO 运营拆成可维护、可复盘的模块</h2>
      </div>
      <div class="landing-refresh-bento-grid">
        <article
          v-for="capability in capabilityCards"
          :key="capability.title"
          :class="['landing-refresh-bento-card', `landing-refresh-bento-card--${capability.tone}`]"
        >
          <el-icon>
            <component :is="capability.icon" />
          </el-icon>
          <strong>{{ capability.title }}</strong>
          <p>{{ capability.description }}</p>
        </article>
      </div>
    </section>

    <section id="teams" class="landing-refresh-teams">
      <div class="landing-refresh-section-heading">
        <p>适用团队</p>
        <h2>不同角色看到同一条 GEO 增长主线</h2>
      </div>
      <div class="landing-refresh-team-grid">
        <article v-for="team in teamCards" :key="team.title">
          <el-icon>
            <component :is="team.icon" />
          </el-icon>
          <strong>{{ team.title }}</strong>
          <p>{{ team.description }}</p>
        </article>
      </div>
    </section>

    <section id="safety" class="landing-refresh-safety">
      <div>
        <p>安全边界</p>
        <h2>把 AI 能力放进可控的运营流程里</h2>
        <span>系统负责组织资料、内容和复盘，关键事实与发布动作仍保留人工确认。</span>
      </div>
      <ul>
        <li v-for="note in safetyNotes" :key="note">{{ note }}</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.landing-refresh-page {
  min-height: 100vh;
  padding: 24px clamp(18px, 4vw, 56px) 64px;
  background:
    linear-gradient(180deg, #f7f9fc 0%, #ffffff 42%, #f6f8fb 100%),
    #ffffff;
  color: #13233a;
}

.landing-refresh-nav {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 18px;
  border: 1px solid #e2e9f2;
  border-radius: 18px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 16px 42px rgb(31 42 68 / 7%);
  backdrop-filter: blur(18px);
}

.landing-refresh-brand,
.landing-refresh-nav-links a,
.landing-refresh-login-link,
.landing-refresh-nav-button,
.landing-refresh-primary-button,
.landing-refresh-secondary-button {
  color: inherit;
  text-decoration: none;
}

.landing-refresh-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  font-size: 18px;
  font-weight: 900;
  white-space: nowrap;
}

.landing-refresh-brand-mark {
  display: grid;
  grid-template-columns: repeat(2, 10px);
  gap: 4px;
  width: 34px;
  height: 34px;
  place-content: center;
  border-radius: 10px;
  background: #f0f5ff;
}

.landing-refresh-brand-mark i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2563eb;
}

.landing-refresh-brand-mark i:nth-child(4) {
  background: #0ea5e9;
}

.landing-refresh-nav-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 26px;
}

.landing-refresh-nav-links a,
.landing-refresh-login-link {
  color: #52647a;
  font-size: 14px;
  font-weight: 750;
}

.landing-refresh-nav-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.landing-refresh-nav-button,
.landing-refresh-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #1d4ed8;
  color: #ffffff;
  font-weight: 850;
  box-shadow: 0 14px 28px rgb(29 78 216 / 20%);
}

.landing-refresh-nav-button {
  min-height: 38px;
  padding: 0 16px;
  font-size: 13px;
}

.landing-refresh-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(500px, 1fr);
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
  max-width: 1280px;
  margin: 42px auto 0;
}

.landing-refresh-hero-copy {
  min-width: 0;
}

.landing-refresh-eyebrow,
.landing-refresh-section-heading p,
.landing-refresh-safety p {
  margin: 0;
  color: #315dff;
  font-size: 13px;
  font-weight: 850;
}

.landing-refresh-hero h1 {
  margin: 14px 0 0;
  color: #101828;
  font-size: clamp(36px, 3.75vw, 54px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
}

.landing-refresh-hero h1 span {
  display: block;
  color: #1d4ed8;
  white-space: nowrap;
}

.landing-refresh-hero h1 .landing-refresh-title-line {
  color: #101828;
}

.landing-refresh-hero-lede {
  max-width: 660px;
  margin: 18px 0 0;
  color: #52647a;
  font-size: 16px;
  line-height: 1.75;
}

.landing-refresh-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 26px;
}

.landing-refresh-primary-button,
.landing-refresh-secondary-button {
  min-height: 50px;
  padding: 0 24px;
  font-size: 15px;
}

.landing-refresh-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d8e1ee;
  border-radius: 10px;
  background: #ffffff;
  color: #1d2939;
  font-weight: 850;
}

.landing-refresh-boundary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.landing-refresh-boundary-tags span {
  padding: 8px 11px;
  border: 1px solid #d9e5f3;
  border-radius: 999px;
  background: #ffffff;
  color: #56687f;
  font-size: 12px;
  font-weight: 750;
}

.landing-refresh-product-preview {
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 24px;
  background:
    radial-gradient(circle at 12% 0%, rgb(37 99 235 / 22%), transparent 30%),
    linear-gradient(145deg, #0f172a 0%, #172033 56%, #0b1220 100%);
  color: #ffffff;
  box-shadow: 0 34px 90px rgb(15 23 42 / 24%);
}

.landing-refresh-preview-topbar,
.landing-refresh-preview-card-title,
.landing-refresh-safety {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.landing-refresh-preview-topbar {
  margin-bottom: 16px;
}

.landing-refresh-preview-topbar div,
.landing-refresh-preview-card-title {
  display: grid;
  gap: 4px;
}

.landing-refresh-preview-topbar strong {
  font-size: 15px;
}

.landing-refresh-preview-topbar span,
.landing-refresh-preview-topbar small,
.landing-refresh-preview-card-title small {
  color: rgb(255 255 255 / 58%);
  font-size: 12px;
}

.landing-refresh-preview-topbar small {
  padding: 6px 9px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  background: rgb(255 255 255 / 7%);
}

.landing-refresh-preview-kpis,
.landing-refresh-preview-main,
.landing-refresh-preview-tasks,
.landing-refresh-metric-grid,
.landing-refresh-workflow-grid,
.landing-refresh-bento-grid,
.landing-refresh-team-grid {
  display: grid;
  gap: 14px;
}

.landing-refresh-preview-kpis {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.landing-refresh-preview-kpis article,
.landing-refresh-preview-chart,
.landing-refresh-preview-donut-card,
.landing-refresh-preview-tasks article {
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  background: rgb(255 255 255 / 8%);
}

.landing-refresh-preview-kpis article {
  display: grid;
  gap: 8px;
  padding: 14px;
}

.landing-refresh-preview-kpis span,
.landing-refresh-preview-tasks span,
.landing-refresh-preview-tasks small,
.landing-refresh-preview-donut-card li {
  color: rgb(255 255 255 / 62%);
  font-size: 12px;
}

.landing-refresh-preview-kpis strong {
  font-size: 28px;
  line-height: 1;
}

.landing-refresh-preview-main {
  grid-template-columns: minmax(0, 1fr) 190px;
  margin-top: 14px;
}

.landing-refresh-preview-chart {
  min-width: 0;
  padding: 16px;
}

.landing-refresh-preview-chart svg {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 8px;
}

.landing-refresh-grid-line {
  stroke: rgb(255 255 255 / 9%);
  stroke-width: 1;
}

.landing-refresh-chart-line {
  fill: none;
  stroke-linecap: round;
  stroke-width: 7;
}

.landing-refresh-chart-line--mention {
  stroke: #60a5fa;
}

.landing-refresh-chart-line--recommend {
  stroke: #0891b2;
}

.landing-refresh-chart-line--cite {
  stroke: #34d399;
}

.landing-refresh-preview-donut-card {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.landing-refresh-preview-donut {
  display: grid;
  width: 126px;
  height: 126px;
  margin: 4px auto;
  place-items: center;
  border-radius: 50%;
  background:
    radial-gradient(circle, #111827 0 45%, transparent 46%),
    conic-gradient(#60a5fa 0 38%, #0891b2 38% 68%, #34d399 68% 86%, #f59e0b 86% 100%);
}

.landing-refresh-preview-donut span,
.landing-refresh-preview-donut small {
  grid-area: 1 / 1;
}

.landing-refresh-preview-donut span {
  margin-top: -12px;
  font-size: 28px;
  font-weight: 950;
}

.landing-refresh-preview-donut small {
  margin-top: 34px;
  color: rgb(255 255 255 / 62%);
}

.landing-refresh-preview-donut-card ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing-refresh-preview-donut-card li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-refresh-preview-donut-card li span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #60a5fa;
}

.landing-refresh-preview-donut-card li:nth-child(2) span {
  background: #0891b2;
}

.landing-refresh-preview-donut-card li:nth-child(3) span {
  background: #34d399;
}

.landing-refresh-preview-tasks {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
}

.landing-refresh-preview-tasks article {
  padding: 13px;
}

.landing-refresh-preview-tasks strong {
  display: block;
  margin: 6px 0 4px;
  font-size: 24px;
}

.landing-refresh-metrics,
.landing-refresh-workflow,
.landing-refresh-capabilities,
.landing-refresh-teams,
.landing-refresh-safety {
  max-width: 1280px;
  margin: 68px auto 0;
}

.landing-refresh-section-heading {
  max-width: 760px;
}

.landing-refresh-section-heading h2,
.landing-refresh-safety h2 {
  margin: 8px 0 0;
  color: #101828;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 920;
  line-height: 1.18;
}

.landing-refresh-section-heading span,
.landing-refresh-safety span {
  display: block;
  margin-top: 10px;
  color: #66788e;
  line-height: 1.7;
}

.landing-refresh-metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
}

.landing-refresh-metric-grid article,
.landing-refresh-workflow-grid article,
.landing-refresh-bento-card,
.landing-refresh-team-grid article {
  border: 1px solid #dfe7f2;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 12px 34px rgb(31 42 68 / 6%);
}

.landing-refresh-metric-grid article {
  display: grid;
  gap: 8px;
  padding: 22px;
}

.landing-refresh-metric-grid span,
.landing-refresh-workflow-grid span {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.landing-refresh-metric-grid strong {
  color: #101828;
  font-size: 34px;
  line-height: 1;
}

.landing-refresh-metric-grid small {
  color: #71839a;
}

.landing-refresh-workflow-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-top: 22px;
}

.landing-refresh-workflow-grid article {
  display: grid;
  gap: 10px;
  min-height: 190px;
  padding: 20px;
}

.landing-refresh-workflow-grid strong,
.landing-refresh-bento-card strong,
.landing-refresh-team-grid strong {
  color: #101828;
  font-size: 17px;
  line-height: 1.35;
}

.landing-refresh-workflow-grid p,
.landing-refresh-bento-card p,
.landing-refresh-team-grid p {
  margin: 0;
  color: #5f7289;
  font-size: 14px;
  line-height: 1.7;
}

.landing-refresh-bento-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
}

.landing-refresh-bento-card {
  display: grid;
  gap: 12px;
  min-height: 198px;
  padding: 20px;
}

.landing-refresh-bento-card:nth-child(1),
.landing-refresh-bento-card:nth-child(4),
.landing-refresh-bento-card:nth-child(6) {
  grid-column: span 2;
}

.landing-refresh-bento-card .el-icon,
.landing-refresh-team-grid .el-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  font-size: 18px;
}

.landing-refresh-bento-card--blue .el-icon,
.landing-refresh-team-grid .el-icon {
  background: #eaf1ff;
  color: #1d4ed8;
}

.landing-refresh-bento-card--cyan .el-icon {
  background: #e6f7fb;
  color: #0891b2;
}

.landing-refresh-bento-card--green .el-icon {
  background: #e9f8f1;
  color: #047857;
}

.landing-refresh-bento-card--amber .el-icon {
  background: #fff7df;
  color: #b45309;
}

.landing-refresh-team-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
}

.landing-refresh-team-grid article {
  display: grid;
  gap: 12px;
  padding: 20px;
}

.landing-refresh-safety {
  align-items: stretch;
  padding: 28px;
  border: 1px solid #dbe5f2;
  border-radius: 24px;
  background:
    linear-gradient(135deg, #ffffff 0%, #f7faff 100%),
    #ffffff;
  box-shadow: 0 16px 46px rgb(31 42 68 / 7%);
}

.landing-refresh-safety > div {
  max-width: 520px;
}

.landing-refresh-safety ul {
  display: grid;
  min-width: 360px;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing-refresh-safety li {
  position: relative;
  padding: 13px 14px 13px 38px;
  border: 1px solid #dfe7f2;
  border-radius: 14px;
  background: #ffffff;
  color: #394b61;
  font-size: 14px;
  font-weight: 700;
}

.landing-refresh-safety li::before {
  position: absolute;
  top: 14px;
  left: 15px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1d4ed8;
  content: "";
}

@media (max-width: 1180px) {
  .landing-refresh-nav,
  .landing-refresh-hero,
  .landing-refresh-safety {
    grid-template-columns: 1fr;
  }

  .landing-refresh-nav-links,
  .landing-refresh-nav-actions {
    justify-content: flex-start;
  }

  .landing-refresh-preview-main,
  .landing-refresh-metric-grid,
  .landing-refresh-bento-grid,
  .landing-refresh-team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-refresh-workflow-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .landing-refresh-page {
    padding: 14px 14px 42px;
  }

  .landing-refresh-nav-links {
    gap: 14px;
  }

  .landing-refresh-hero {
    margin-top: 34px;
  }

  .landing-refresh-hero h1 span {
    white-space: normal;
  }

  .landing-refresh-preview-kpis,
  .landing-refresh-preview-main,
  .landing-refresh-preview-tasks,
  .landing-refresh-metric-grid,
  .landing-refresh-workflow-grid,
  .landing-refresh-bento-grid,
  .landing-refresh-team-grid {
    grid-template-columns: 1fr;
  }

  .landing-refresh-bento-card:nth-child(1),
  .landing-refresh-bento-card:nth-child(4),
  .landing-refresh-bento-card:nth-child(6) {
    grid-column: auto;
  }

  .landing-refresh-safety {
    padding: 20px;
  }

  .landing-refresh-safety ul {
    min-width: 0;
  }
}
</style>

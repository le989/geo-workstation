<script setup lang="ts">
import { ref } from "vue";
import {
  CollectionTag,
  DataBoard,
  EditPen,
  Files,
  PieChart,
  Search,
  Setting,
  TrendCharts
} from "@element-plus/icons-vue";

const activePreview = ref("landing");

const capabilityCards = [
  {
    title: "GEO 诊断",
    icon: Search,
    copy: "识别品牌、官网与产品线在 AI 搜索中的机会和风险。"
  },
  {
    title: "提示词策略库",
    icon: CollectionTag,
    copy: "沉淀训练词、蒸馏词、品牌词和场景词。"
  },
  {
    title: "企业知识库",
    icon: Files,
    copy: "维护产品、案例、FAQ、资质和解决方案事实底座。"
  },
  {
    title: "内容生成",
    icon: EditPen,
    copy: "围绕提示词和知识库生成可发布的 GEO 内容资产。"
  },
  {
    title: "模型覆盖记录",
    icon: TrendCharts,
    copy: "记录模型提及、推荐、官网引用和竞品占位。"
  },
  {
    title: "GEO 报表",
    icon: PieChart,
    copy: "复盘覆盖率、内容缺口和下一步优化动作。"
  }
];

const workflowSteps = ["诊断", "策略", "资产", "生成", "检测", "复盘"];

const sidebarItems = [
  { title: "工作台", icon: DataBoard, active: true },
  { title: "GEO 诊断", icon: Search, active: false },
  { title: "提示词策略库", icon: CollectionTag, active: false },
  { title: "企业知识库", icon: Files, active: false },
  { title: "内容生成", icon: EditPen, active: false },
  { title: "模型覆盖记录", icon: TrendCharts, active: false },
  { title: "GEO 报表", icon: PieChart, active: false },
  { title: "系统设置", icon: Setting, active: false }
];

const metricCards = [
  { label: "追踪提示词", value: "426", trend: "+32 本周" },
  { label: "品牌推荐率", value: "38.6%", trend: "+6.2%" },
  { label: "知识片段", value: "1,284", trend: "覆盖 9 条产品线" },
  { label: "待优化事项", value: "17", trend: "优先处理 5 条" }
];
</script>

<template>
  <main class="geo-preview-page">
    <section class="geo-preview-shell">
      <div class="geo-preview-alert">
        这是 UI-4 视觉预览页，不影响正式系统页面。
      </div>

      <header class="geo-preview-header">
        <div>
          <p class="geo-preview-kicker">Phase UI-4 Preview</p>
          <h1>GEO 工作站视觉方向预览</h1>
          <span>仅用于确认后续首页、登录页和内页统一风格。</span>
        </div>
        <RouterLink class="geo-preview-header-link" to="/dashboard">返回正式工作台</RouterLink>
      </header>

      <el-tabs v-model="activePreview" class="geo-preview-tabs">
        <el-tab-pane label="首页预览" name="landing">
          <section class="geo-preview-landing">
            <nav class="geo-preview-nav" aria-label="预览首页导航">
              <strong>GEO 工作站</strong>
              <div>
                <a href="#preview-capability">产品能力</a>
                <a href="#preview-flow">工作流程</a>
                <a href="#preview-local">本地部署</a>
                <a href="#preview-help">使用帮助</a>
              </div>
              <button type="button">登录工作站</button>
            </nav>

            <section class="geo-preview-hero">
              <div class="geo-preview-hero-copy">
                <p class="geo-preview-kicker">AI Search Visibility Ops</p>
                <h2>GEO 工作站</h2>
                <h3>AI 搜索可见度运营闭环</h3>
                <p>
                  从 GEO 诊断、提示词策略、企业知识库、内容生成到模型复测，把 AI 搜索可见度运营做成一条可执行流程。
                </p>
                <div class="geo-preview-actions">
                  <button type="button">登录工作站</button>
                  <button type="button" class="geo-preview-secondary-button">查看工作流程</button>
                </div>
              </div>

              <div class="geo-preview-workstation-card" aria-label="预览工作台视觉">
                <div class="geo-preview-workstation-toolbar">
                  <span />
                  <span />
                  <span />
                  <strong>GEO Ops Board</strong>
                </div>
                <div class="geo-preview-workstation-grid">
                  <article>
                    <span>未命中词</span>
                    <strong>23</strong>
                    <small>需要补齐问答素材</small>
                  </article>
                  <article>
                    <span>内容生成</span>
                    <strong>14</strong>
                    <small>待审校稿件</small>
                  </article>
                  <article>
                    <span>模型覆盖</span>
                    <strong>68%</strong>
                    <small>推荐率提升中</small>
                  </article>
                  <article>
                    <span>GEO 报表</span>
                    <strong>5</strong>
                    <small>关键优化建议</small>
                  </article>
                </div>
              </div>
            </section>

            <section id="preview-capability" class="geo-preview-capabilities">
              <article v-for="item in capabilityCards" :key="item.title">
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <strong>{{ item.title }}</strong>
                <p>{{ item.copy }}</p>
              </article>
            </section>

            <section id="preview-flow" class="geo-preview-flow">
              <div v-for="(step, index) in workflowSteps" :key="step">
                <span>{{ String(index + 1).padStart(2, "0") }}</span>
                <strong>{{ step }}</strong>
              </div>
            </section>

            <div class="geo-preview-boundary">
              联网 Provider 结果不等同于 App 端真实用户结果，发布内容和参数事实仍需人工确认。
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="登录页预览" name="login">
          <section class="geo-preview-login">
            <div class="geo-preview-login-copy">
              <p class="geo-preview-kicker">Internal GEO Console</p>
              <h2>GEO 工作站</h2>
              <h3>AI 搜索可见度运营闭环</h3>
              <ul>
                <li>发现未命中机会</li>
                <li>补齐知识库和内容</li>
                <li>多模型复测验证结果</li>
                <li>报表复盘</li>
              </ul>
            </div>

            <form class="geo-preview-login-card" aria-label="预览登录卡片">
              <p class="geo-preview-kicker">Sign In</p>
              <h2>登录工作站</h2>
              <label>
                用户 / 邮箱
                <input placeholder="admin@example.com" type="text">
              </label>
              <label>
                密码
                <input placeholder="请输入密码" type="password">
              </label>
              <div class="geo-preview-login-row">
                <label class="geo-preview-checkbox">
                  <input type="checkbox">
                  记住我
                </label>
                <button type="button">忘记密码</button>
              </div>
              <button type="button" class="geo-preview-login-submit">登录</button>
              <div class="geo-preview-login-status">
                <span>本地 / 模拟环境</span>
                <span>API 状态：正常</span>
              </div>
            </form>
          </section>
        </el-tab-pane>

        <el-tab-pane label="内页预览" name="dashboard">
          <section class="geo-preview-dashboard">
            <aside class="geo-preview-sidebar">
              <div class="geo-preview-sidebar-brand">
                <span>GEO</span>
                <strong>GEO 工作站</strong>
                <small>AI 搜索可见度运营闭环</small>
              </div>
              <nav>
                <a
                  v-for="item in sidebarItems"
                  :key="item.title"
                  :class="{ 'is-active': item.active }"
                  href="#"
                >
                  <el-icon>
                    <component :is="item.icon" />
                  </el-icon>
                  <span>{{ item.title }}</span>
                </a>
              </nav>
              <div class="geo-preview-sidebar-user">
                <span>当前工作站</span>
                <strong>GEO Admin</strong>
                <small>管理员 · 本地 / 模拟</small>
              </div>
            </aside>

            <section class="geo-preview-main">
              <header class="geo-preview-main-header">
                <div>
                  <h2>工作台</h2>
                  <span>今日运营动作与待处理事项</span>
                </div>
                <div>
                  <span>本地 / 模拟</span>
                  <button type="button">API 状态</button>
                </div>
              </header>

              <div class="geo-preview-main-content">
                <section class="geo-preview-today">
                  <div>
                    <p class="geo-preview-kicker">Today</p>
                    <h3>今日三件事</h3>
                    <span>先处理最能推动 GEO 闭环的动作。</span>
                  </div>
                  <button type="button">新建诊断</button>
                </section>

                <section class="geo-preview-metrics">
                  <article v-for="metric in metricCards" :key="metric.label">
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                    <small>{{ metric.trend }}</small>
                  </article>
                </section>

                <section class="geo-preview-dashboard-grid">
                  <article class="geo-preview-panel geo-preview-panel-wide">
                    <div class="geo-preview-panel-header">
                      <h3>可见度趋势</h3>
                      <span>近 7 天</span>
                    </div>
                    <div class="geo-preview-chart">
                      <i style="height: 38%" />
                      <i style="height: 54%" />
                      <i style="height: 46%" />
                      <i style="height: 70%" />
                      <i style="height: 62%" />
                      <i style="height: 78%" />
                      <i style="height: 84%" />
                    </div>
                  </article>

                  <article class="geo-preview-panel">
                    <div class="geo-preview-panel-header">
                      <h3>模型覆盖分布</h3>
                      <span>模拟数据</span>
                    </div>
                    <div class="geo-preview-model-list">
                      <span>Kimi <strong>72%</strong></span>
                      <span>豆包 <strong>64%</strong></span>
                      <span>通义 <strong>58%</strong></span>
                    </div>
                  </article>

                  <article class="geo-preview-panel geo-preview-panel-queue">
                    <div class="geo-preview-panel-header">
                      <h3>待处理队列</h3>
                      <span>5 项</span>
                    </div>
                    <ul>
                      <li>补齐 8 条未命中问题的 FAQ</li>
                      <li>复测 3 个高优先级品牌词</li>
                      <li>审校 2 篇场景方案内容</li>
                    </ul>
                  </article>
                </section>
              </div>
            </section>
          </section>
        </el-tab-pane>
      </el-tabs>
    </section>
  </main>
</template>

<style scoped>
.geo-preview-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 10%, rgb(124 58 237 / 12%), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f6f4fb 100%);
  color: #15131d;
}

.geo-preview-shell {
  width: min(1220px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 48px;
}

.geo-preview-alert {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #ded8eb;
  border-radius: 8px;
  background: #fff;
  color: #5d5669;
  font-size: 13px;
  font-weight: 700;
}

.geo-preview-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.geo-preview-header h1,
.geo-preview-hero h2,
.geo-preview-login-copy h2 {
  margin: 6px 0;
  color: #0d0b12;
  font-size: 44px;
  font-weight: 900;
  line-height: 1.05;
}

.geo-preview-header span,
.geo-preview-main-header span,
.geo-preview-hero p,
.geo-preview-boundary,
.geo-preview-login-card,
.geo-preview-login-copy h3 {
  color: #676071;
}

.geo-preview-kicker {
  margin: 0;
  color: #6d28ff;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.geo-preview-header-link,
.geo-preview-nav button,
.geo-preview-actions button,
.geo-preview-today button,
.geo-preview-main-header button {
  border: 0;
  border-radius: 8px;
  background: #6d28ff;
  color: #fff;
  font-weight: 800;
  text-decoration: none;
  cursor: default;
}

.geo-preview-header-link {
  padding: 10px 14px;
}

.geo-preview-tabs {
  border: 1px solid #e5e0ef;
  border-radius: 12px;
  background: rgb(255 255 255 / 86%);
  box-shadow: 0 18px 48px rgb(24 20 36 / 8%);
}

.geo-preview-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 10px 18px 0;
}

.geo-preview-tabs :deep(.el-tabs__content) {
  padding: 24px;
}

.geo-preview-landing,
.geo-preview-login,
.geo-preview-dashboard {
  min-height: 680px;
}

.geo-preview-nav {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 22px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid #e5e0ef;
  border-radius: 12px;
  background: #ffffff;
}

.geo-preview-nav strong {
  font-size: 18px;
}

.geo-preview-nav div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
}

.geo-preview-nav a {
  color: #2b2735;
  font-weight: 700;
  text-decoration: none;
}

.geo-preview-nav button,
.geo-preview-actions button,
.geo-preview-today button,
.geo-preview-main-header button {
  padding: 10px 15px;
}

.geo-preview-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
  gap: 28px;
  align-items: center;
  padding: 42px 0 28px;
}

.geo-preview-hero h3,
.geo-preview-login-copy h3 {
  margin: 0 0 14px;
  color: #6d28ff;
  font-size: 26px;
  line-height: 1.2;
}

.geo-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.geo-preview-actions .geo-preview-secondary-button {
  border: 1px solid #d7cbed;
  background: #fff;
  color: #221c2d;
}

.geo-preview-workstation-card {
  overflow: hidden;
  border: 1px solid #ded8eb;
  border-radius: 16px;
  background: #111019;
  box-shadow: 0 26px 60px rgb(17 16 25 / 18%);
}

.geo-preview-workstation-toolbar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
  color: #fff;
}

.geo-preview-workstation-toolbar span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #baff29;
}

.geo-preview-workstation-toolbar span:nth-child(2) {
  background: #8b5cf6;
}

.geo-preview-workstation-toolbar span:nth-child(3) {
  background: #fff;
}

.geo-preview-workstation-toolbar strong {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.72;
}

.geo-preview-workstation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
}

.geo-preview-workstation-grid article,
.geo-preview-capabilities article,
.geo-preview-metrics article,
.geo-preview-panel,
.geo-preview-today {
  border: 1px solid #e5e0ef;
  border-radius: 12px;
  background: #ffffff;
}

.geo-preview-workstation-grid article {
  min-height: 128px;
  padding: 16px;
}

.geo-preview-workstation-grid span,
.geo-preview-metrics span,
.geo-preview-panel-header span {
  color: #716a7e;
  font-size: 13px;
  font-weight: 700;
}

.geo-preview-workstation-grid strong {
  display: block;
  margin: 12px 0 6px;
  color: #111019;
  font-size: 30px;
}

.geo-preview-workstation-grid small,
.geo-preview-metrics small {
  color: #706879;
}

.geo-preview-workstation-grid article:first-child {
  border-color: #d8c9ff;
  background: #f5f0ff;
}

.geo-preview-workstation-grid article:nth-child(3) {
  border-color: #dff9a3;
  background: #f7ffe6;
}

.geo-preview-capabilities {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 10px;
}

.geo-preview-capabilities article {
  min-height: 160px;
  padding: 18px;
}

.geo-preview-capabilities .el-icon {
  color: #6d28ff;
  font-size: 24px;
}

.geo-preview-capabilities strong {
  display: block;
  margin: 14px 0 8px;
  color: #15131d;
  font-size: 18px;
}

.geo-preview-capabilities p {
  margin: 0;
  color: #676071;
  line-height: 1.65;
}

.geo-preview-flow {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.geo-preview-flow div {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid #e5e0ef;
  border-radius: 12px;
  background: #fff;
}

.geo-preview-flow span {
  color: #6d28ff;
  font-size: 12px;
  font-weight: 900;
}

.geo-preview-flow div:nth-child(3n) span {
  color: #5a7800;
}

.geo-preview-flow strong {
  color: #18141f;
}

.geo-preview-boundary {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e0ef;
  border-left: 5px solid #baff29;
  border-radius: 10px;
  background: #ffffff;
  line-height: 1.65;
}

.geo-preview-login {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  gap: 30px;
  align-items: center;
  padding: 36px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 20% 18%, rgb(186 255 41 / 22%), transparent 26%),
    linear-gradient(135deg, #111019 0%, #1b1430 100%);
}

.geo-preview-login-copy {
  color: #fff;
}

.geo-preview-login-copy h2 {
  color: #fff;
  font-size: 54px;
}

.geo-preview-login-copy h3 {
  color: rgb(255 255 255 / 72%);
}

.geo-preview-login-copy ul {
  display: grid;
  gap: 12px;
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
}

.geo-preview-login-copy li {
  padding: 13px 15px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 10px;
  background: rgb(255 255 255 / 8%);
  color: #fff;
  font-weight: 750;
}

.geo-preview-login-card {
  display: grid;
  gap: 14px;
  padding: 28px;
  border-radius: 14px;
  background: #fff;
}

.geo-preview-login-card h2 {
  margin: 0;
  color: #111019;
  font-size: 28px;
}

.geo-preview-login-card label {
  display: grid;
  gap: 7px;
  color: #332d3d;
  font-weight: 700;
}

.geo-preview-login-card input {
  height: 38px;
  padding: 0 11px;
  border: 1px solid #ded8eb;
  border-radius: 8px;
}

.geo-preview-login-row,
.geo-preview-login-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.geo-preview-checkbox {
  display: flex !important;
  grid-template-columns: auto 1fr;
  align-items: center;
}

.geo-preview-checkbox input {
  width: 14px;
  height: 14px;
}

.geo-preview-login-row button {
  border: 0;
  background: transparent;
  color: #6d28ff;
  font-weight: 800;
}

.geo-preview-login-submit {
  height: 42px;
  border: 0;
  border-radius: 8px;
  background: #6d28ff;
  color: #fff;
  font-weight: 900;
}

.geo-preview-login-status {
  padding-top: 10px;
  border-top: 1px solid #eee9f5;
  color: #716a7e;
  font-size: 12px;
  font-weight: 700;
}

.geo-preview-dashboard {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #ded8eb;
  border-radius: 18px;
  background: #f7f5fb;
}

.geo-preview-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 720px;
  padding: 18px 12px;
  background:
    radial-gradient(circle at 22% 8%, rgb(109 40 255 / 35%), transparent 32%),
    #111019;
  color: #fff;
}

.geo-preview-sidebar-brand {
  display: grid;
  gap: 5px;
  padding: 0 8px 18px;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.geo-preview-sidebar-brand span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 10px;
  background: #baff29;
  color: #111019;
  font-weight: 950;
}

.geo-preview-sidebar-brand strong {
  margin-top: 4px;
}

.geo-preview-sidebar-brand small,
.geo-preview-sidebar-user small,
.geo-preview-sidebar-user span {
  color: rgb(255 255 255 / 58%);
}

.geo-preview-sidebar nav {
  display: grid;
  gap: 4px;
  margin-top: 18px;
}

.geo-preview-sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  color: rgb(255 255 255 / 72%);
  font-weight: 750;
  text-decoration: none;
}

.geo-preview-sidebar nav a.is-active {
  background: linear-gradient(135deg, #6d28ff, #9b7cff);
  color: #fff;
}

.geo-preview-sidebar-user {
  display: grid;
  gap: 5px;
  margin-top: auto;
  padding: 14px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 12px;
  background: rgb(255 255 255 / 7%);
}

.geo-preview-main {
  min-width: 0;
}

.geo-preview-main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 24px;
  border-bottom: 1px solid #e8e2f2;
  background: rgb(255 255 255 / 92%);
}

.geo-preview-main-header h2 {
  margin: 0 0 4px;
  color: #111019;
  font-size: 24px;
}

.geo-preview-main-header > div:last-child {
  display: flex;
  align-items: center;
  gap: 10px;
}

.geo-preview-main-header > div:last-child span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f2ffe0;
  color: #405d00;
  font-size: 12px;
  font-weight: 800;
}

.geo-preview-main-content {
  display: grid;
  gap: 16px;
  padding: 20px 24px 24px;
}

.geo-preview-today {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.geo-preview-today h3,
.geo-preview-panel h3 {
  margin: 4px 0;
  color: #15131d;
}

.geo-preview-today span {
  color: #676071;
}

.geo-preview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.geo-preview-metrics article {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.geo-preview-metrics strong {
  color: #15131d;
  font-size: 28px;
}

.geo-preview-metrics article:nth-child(2) {
  border-color: #d8c9ff;
  background: #f6f1ff;
}

.geo-preview-metrics article:nth-child(3) {
  border-color: #def4a8;
  background: #f8ffe8;
}

.geo-preview-dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 14px;
}

.geo-preview-panel {
  min-width: 0;
  padding: 18px;
}

.geo-preview-panel-wide {
  grid-row: span 2;
}

.geo-preview-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.geo-preview-chart {
  display: flex;
  align-items: end;
  gap: 12px;
  height: 230px;
  margin-top: 20px;
  padding: 18px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fbfaff 0%, #f2edf9 100%);
}

.geo-preview-chart i {
  flex: 1;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, #6d28ff, #baff29);
}

.geo-preview-model-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.geo-preview-model-list span {
  display: flex;
  justify-content: space-between;
  padding: 11px 12px;
  border-radius: 10px;
  background: #fbfaff;
  color: #4c4558;
}

.geo-preview-panel-queue ul {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  padding-left: 18px;
  color: #514a5d;
  line-height: 1.55;
}

@media (max-width: 980px) {
  .geo-preview-header,
  .geo-preview-hero,
  .geo-preview-login,
  .geo-preview-dashboard,
  .geo-preview-dashboard-grid {
    grid-template-columns: 1fr;
  }

  .geo-preview-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .geo-preview-nav {
    grid-template-columns: 1fr;
  }

  .geo-preview-nav div {
    justify-content: flex-start;
  }

  .geo-preview-capabilities,
  .geo-preview-metrics,
  .geo-preview-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-preview-sidebar {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .geo-preview-shell {
    width: min(100% - 24px, 1220px);
  }

  .geo-preview-tabs :deep(.el-tabs__content) {
    padding: 14px;
  }

  .geo-preview-header h1,
  .geo-preview-hero h2,
  .geo-preview-login-copy h2 {
    font-size: 34px;
  }

  .geo-preview-workstation-grid,
  .geo-preview-capabilities,
  .geo-preview-metrics,
  .geo-preview-flow {
    grid-template-columns: 1fr;
  }

  .geo-preview-login,
  .geo-preview-main-header,
  .geo-preview-today {
    padding: 18px;
  }
}
</style>

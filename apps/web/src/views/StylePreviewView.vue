<script setup lang="ts">
import { ref } from "vue";
import {
  CollectionTag,
  DataBoard,
  DocumentChecked,
  EditPen,
  Files,
  Guide,
  MagicStick,
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
    copy: "发现机会与风险",
    active: false
  },
  {
    title: "提示词策略",
    icon: CollectionTag,
    copy: "锁定可见关键词",
    active: false
  },
  {
    title: "知识库",
    icon: Files,
    copy: "沉淀可信知识资产",
    active: false
  },
  {
    title: "内容生成",
    icon: EditPen,
    copy: "AI 驱动批量产出",
    active: false
  },
  {
    title: "模型覆盖记录",
    icon: TrendCharts,
    copy: "多模型覆盖追踪",
    active: false
  },
  {
    title: "GEO 报表",
    icon: PieChart,
    copy: "可视化效果复盘",
    active: true
  },
  {
    title: "系统设置",
    icon: Setting,
    copy: "配置与权限管理",
    active: false
  }
];

const workflowSteps = [
  { title: "诊断", copy: "发现问题，定位机会" },
  { title: "策略", copy: "提示词策略，内容策略" },
  { title: "资产", copy: "知识库，内容资产沉淀" },
  { title: "生成", copy: "AI 生成内容，多模态覆盖" },
  { title: "检测", copy: "模型覆盖追踪，效果监测" },
  { title: "复盘", copy: "数据驱动，持续优化" }
];

const sidebarItems = [
  { title: "工作台", icon: DataBoard, active: true },
  { title: "GEO 诊断", icon: Search, active: false },
  { title: "提示词策略库", icon: CollectionTag, active: false },
  { title: "AI 拓词", icon: MagicStick, active: false },
  { title: "企业 GEO 知识库", icon: Files, active: false },
  { title: "指令库", icon: DocumentChecked, active: false },
  { title: "GEO 内容生成", icon: EditPen, active: false },
  { title: "模型覆盖记录", icon: TrendCharts, active: false },
  { title: "GEO 报表", icon: PieChart, active: false },
  { title: "系统设置", icon: Setting, active: false },
  { title: "使用教程", icon: Guide, active: false }
];

const previewTodayActions = [
  {
    title: "补 GEO 检测",
    signal: "213 个追踪词待补检测",
    buttonLabel: "去补检测",
    icon: TrendCharts,
    tone: "primary"
  },
  {
    title: "补内容",
    signal: "221 个任务 / 316 篇内容",
    buttonLabel: "去生成内容",
    icon: EditPen,
    tone: "accent"
  },
  {
    title: "补知识库",
    signal: "171 条知识片段",
    buttonLabel: "去补知识库",
    icon: Files,
    tone: "plain"
  }
];

const previewCoreMetrics = [
  { label: "GEO 提示词", value: "1044", description: "追踪词 426 / 高优先级 128" },
  { label: "知识库", value: "254", description: "171 条知识片段" },
  { label: "内容任务 / 内容", value: "221 / 316", description: "25 个失败任务待处理" },
  { label: "GEO 检测记录", value: "659", description: "品牌推荐率 30.3%" }
];

const previewQueues = [
  {
    title: "待补检测 GEO 词",
    status: "213 个追踪词待处理",
    action: "查看检测记录",
    tone: "warning"
  },
  {
    title: "待质检 / 优化内容",
    status: "25 个失败任务需处理",
    action: "查看内容任务",
    tone: "danger"
  },
  {
    title: "待补知识资料",
    status: "254 个知识库 / 171 条片段",
    action: "查看知识库",
    tone: "default"
  },
  {
    title: "待看命中汇总",
    status: "品牌推荐率 30.3%",
    action: "打开 GEO 报表",
    tone: "good"
  }
];

const previewSuggestions = [
  { title: "补知识库资料：默认产品线", action: "去知识库补资料" },
  { title: "优化内容结构：激光测距传感器怎么选", action: "去生成内容" },
  { title: "复测 GEO 命中：Kimi / 豆包 / 通义", action: "去补检测记录" }
];

const previewQuickLinks = [
  { title: "新建 GEO 诊断", icon: Search },
  { title: "生成 GEO 内容", icon: EditPen },
  { title: "查看 GEO 报表", icon: PieChart },
  { title: "进入知识库", icon: Files }
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
              <strong class="geo-preview-nav-brand">
                <span class="geo-preview-logo-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                GEO 工作站
              </strong>
              <div class="geo-preview-nav-links">
                <a href="#preview-capability">产品能力</a>
                <a href="#preview-flow">工作流程</a>
                <a href="#preview-local">本地部署</a>
                <a href="#preview-help">使用帮助</a>
              </div>
              <div class="geo-preview-nav-actions">
                <button type="button" class="geo-preview-nav-login">登录</button>
                <button type="button">登录工作站</button>
              </div>
            </nav>

            <section class="geo-preview-hero">
              <div class="geo-preview-hero-copy">
                <p class="geo-preview-kicker">GEO SEARCH VISIBILITY</p>
                <h2>GEO 工作站</h2>
                <h3>
                  让 <em>AI 搜索看见你</em>，<br>
                  信任你，引用你。
                </h3>
                <p>
                  一站式 GEO 运营平台，覆盖诊断、策略、资产、内容生成、检测和复盘，构建可被 AI 信任与引用的内容体系。
                </p>
                <div class="geo-preview-actions">
                  <button type="button">登录工作站</button>
                  <button type="button" class="geo-preview-secondary-button">查看工作流程</button>
                </div>
                <div class="geo-preview-hero-checks" aria-label="预览提示">
                  <span>本地 / 模拟环境</span>
                  <span>事实人工确认</span>
                  <span>不展示密钥</span>
                </div>
              </div>

              <div class="geo-preview-collage" aria-label="GEO 首页参考图 collage 视觉">
                <div class="geo-preview-collage-dots" />
                <div class="geo-preview-collage-cross geo-preview-collage-cross-one" />
                <div class="geo-preview-collage-cross geo-preview-collage-cross-two" />
                <div class="geo-preview-collage-circle" />
                <div class="geo-preview-rock geo-preview-rock-left" />
                <div class="geo-preview-rock geo-preview-rock-white" />
                <div class="geo-preview-rock geo-preview-rock-black" />
                <div class="geo-preview-rock geo-preview-rock-front" />
                <div class="geo-preview-brush" />
                <div class="geo-preview-fragment geo-preview-fragment-one" />
                <div class="geo-preview-fragment geo-preview-fragment-two" />
                <svg class="geo-preview-arrow" viewBox="0 0 260 150" aria-hidden="true">
                  <path
                    d="M18 128C74 91 126 56 210 29"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="6"
                  />
                  <path
                    d="M177 13l55 10-31 45"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="6"
                  />
                </svg>
                <div class="geo-preview-script">Search Everywhere.</div>
                <div class="geo-preview-ai-badge">AI<br>Visibility</div>
                <div class="geo-preview-vertical">GEO WORKSTATION</div>
                <article class="geo-preview-visibility-card">
                  <span>品牌可见度</span>
                  <div class="geo-preview-mini-line" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <strong>+28.6%</strong>
                  <small>较上期提升</small>
                </article>
              </div>
            </section>

            <section id="preview-capability" class="geo-preview-feature-strip">
              <article
                v-for="item in capabilityCards"
                :key="item.title"
                :class="{ 'is-active': item.active }"
              >
                <el-icon>
                  <component :is="item.icon" />
                </el-icon>
                <strong>{{ item.title }}</strong>
                <p>{{ item.copy }}</p>
              </article>
            </section>

            <section id="preview-flow" class="geo-preview-workflow">
              <div class="geo-preview-workflow-title">
                <strong>从洞察到增长</strong>
                <span>闭环驱动可见度提升</span>
              </div>
              <div class="geo-preview-workflow-steps">
                <article v-for="(step, index) in workflowSteps" :key="step.title">
                  <span>{{ String(index + 1).padStart(2, "0") }}</span>
                  <strong>{{ step.title }}</strong>
                  <p>{{ step.copy }}</p>
                </article>
              </div>
            </section>

            <section id="preview-local" class="geo-preview-dark-cta">
              <div class="geo-preview-dark-copy">
                <h2>
                  让 AI 更懂你，<br>
                  让世界更容易找到你。
                </h2>
                <p>
                  GEO 工作站帮助你建立可被 AI 理解、信任并引用的内容体系，在每一次 AI 搜索与回答中，占据更靠前的位置。
                </p>
                <span>GEO visibility system</span>
              </div>
              <div class="geo-preview-dark-cards">
                <article>
                  <span>可见度提升</span>
                  <strong>+68%</strong>
                  <small>平均可见度提升</small>
                  <i aria-hidden="true" />
                </article>
                <article>
                  <span>引用机会增加</span>
                  <strong>+42%</strong>
                  <small>平均引用机会提升</small>
                  <i aria-hidden="true" />
                </article>
                <article>
                  <span>无效内容减少</span>
                  <strong>-37%</strong>
                  <small>无效内容占比下降</small>
                  <i aria-hidden="true" />
                </article>
              </div>
              <button type="button">登录工作站</button>
            </section>

            <div id="preview-help" class="geo-preview-boundary">
              联网 Provider 结果不等同于 App 端真实用户结果，发布内容和参数事实仍需人工确认。
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="登录页预览" name="login">
          <section class="geo-preview-login">
            <div class="geo-preview-login-copy">
              <div class="geo-preview-login-grid" aria-hidden="true" />
              <div class="geo-preview-login-orb" aria-hidden="true" />
              <div class="geo-preview-login-slab" aria-hidden="true" />
              <div class="geo-preview-login-brush" aria-hidden="true" />
              <p class="geo-preview-kicker">GEO SEARCH VISIBILITY</p>
              <h2>GEO 工作站</h2>
              <h3>AI 搜索可见度运营闭环</h3>
              <p class="geo-preview-login-lede">
                从未命中词发现、知识库补齐、内容生成到多模型复测，让 GEO 运营变成可执行、可追踪、可复盘的工作流。
              </p>
              <ul>
                <li>发现未命中机会</li>
                <li>补齐知识库和内容</li>
                <li>多模型复测验证结果</li>
                <li>报表复盘持续优化</li>
              </ul>
              <article class="geo-preview-login-signal">
                <span>Visibility Loop</span>
                <strong>诊断 → 生成 → 复测</strong>
              </article>
            </div>

            <form class="geo-preview-login-card" aria-label="预览登录卡片">
              <p class="geo-preview-kicker">Workspace Sign In</p>
              <h2>登录工作站</h2>
              <span class="geo-preview-login-card-copy">
                进入 GEO 运营闭环，继续处理诊断、内容和复测任务。
              </span>
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
                <button type="button">忘记密码？</button>
              </div>
              <button type="button" class="geo-preview-login-submit">登录</button>
              <div class="geo-preview-login-status">
                <span><i aria-hidden="true" />本地 / 模拟环境</span>
                <span><i aria-hidden="true" />API 状态：正常</span>
              </div>
            </form>
          </section>
        </el-tab-pane>

        <el-tab-pane label="内页预览" name="dashboard">
          <section class="geo-preview-dashboard geo-preview-workbench">
            <aside class="geo-preview-sidebar">
              <div class="geo-preview-sidebar-brand">
                <span class="geo-preview-sidebar-logo" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>GEO 工作站</strong>
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
                <span class="geo-preview-user-dot" aria-hidden="true">G</span>
                <div>
                  <strong>GEO Admin</strong>
                  <small>管理员 · 本地 / 模拟</small>
                </div>
              </div>
            </aside>

            <section class="geo-preview-main">
              <header class="geo-preview-main-header">
                <div>
                  <h2>工作台</h2>
                  <span>今日运营动作与待处理事项</span>
                </div>
                <div class="geo-preview-header-status">
                  <span>本地 / 模拟</span>
                  <span><i aria-hidden="true" />API 状态：正常</span>
                  <button type="button" aria-label="通知">!</button>
                  <span class="geo-preview-header-user">GEO Admin</span>
                </div>
              </header>

              <div class="geo-preview-main-content">
                <section class="geo-preview-workbench-hero">
                  <div>
                    <p class="geo-preview-kicker">GEO Workbench</p>
                    <h3>工作台</h3>
                    <strong>今天把 GEO 闭环往前推进一步。</strong>
                    <span>首页优先显示今天该处理的运营动作：补检测、补内容、补知识库，再查看命中结果。</span>
                  </div>
                  <button type="button">刷新工作台</button>
                </section>

                <section class="geo-preview-action-grid" aria-label="今日三件事">
                  <article
                    v-for="action in previewTodayActions"
                    :key="action.title"
                    :class="`is-${action.tone}`"
                  >
                    <span class="geo-preview-action-icon">
                      <el-icon>
                        <component :is="action.icon" />
                      </el-icon>
                    </span>
                    <div>
                      <strong>{{ action.title }}</strong>
                      <p>{{ action.signal }}</p>
                    </div>
                    <button type="button">{{ action.buttonLabel }}</button>
                  </article>
                </section>

                <section class="geo-preview-core-grid" aria-label="核心数据概况">
                  <article v-for="metric in previewCoreMetrics" :key="metric.label">
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                    <small>{{ metric.description }}</small>
                  </article>
                </section>

                <section class="geo-preview-workbench-grid">
                  <article class="geo-preview-card geo-preview-queue-card">
                    <div class="geo-preview-card-header">
                      <div>
                        <h3>待处理运营队列</h3>
                        <span>按当前 Dashboard 真实运营动作组织</span>
                      </div>
                    </div>
                    <div class="geo-preview-queue-list">
                      <article
                        v-for="queue in previewQueues"
                        :key="queue.title"
                        :class="`is-${queue.tone}`"
                      >
                        <div>
                          <strong>{{ queue.title }}</strong>
                          <span>{{ queue.status }}</span>
                        </div>
                        <button type="button">{{ queue.action }}</button>
                      </article>
                    </div>
                  </article>

                  <article class="geo-preview-card geo-preview-suggestion-card">
                    <div class="geo-preview-card-header">
                      <div>
                        <h3>最近待优化建议</h3>
                        <span>不超过 3 条，避免首页堆信息</span>
                      </div>
                    </div>
                    <ul>
                      <li v-for="suggestion in previewSuggestions" :key="suggestion.title">
                        <span aria-hidden="true" />
                        <div>
                          <strong>{{ suggestion.title }}</strong>
                          <small>{{ suggestion.action }}</small>
                        </div>
                      </li>
                    </ul>
                  </article>

                  <article class="geo-preview-card geo-preview-quick-card">
                    <div class="geo-preview-card-header">
                      <div>
                        <h3>快捷入口</h3>
                        <span>常用运营页面</span>
                      </div>
                    </div>
                    <div class="geo-preview-quick-grid">
                      <button v-for="link in previewQuickLinks" :key="link.title" type="button">
                        <el-icon>
                          <component :is="link.icon" />
                        </el-icon>
                        {{ link.title }}
                      </button>
                    </div>
                  </article>

                  <article class="geo-preview-card geo-preview-system-card">
                    <div class="geo-preview-card-header">
                      <div>
                        <h3>系统状态</h3>
                        <span>预览状态，不调用真实接口</span>
                      </div>
                    </div>
                    <div class="geo-preview-system-list">
                      <span><i aria-hidden="true" />本地 / 模拟环境</span>
                      <span><i aria-hidden="true" />API 状态：正常</span>
                      <span><i aria-hidden="true" />AI Provider：后端环境变量托管</span>
                    </div>
                  </article>
                </section>

                <section class="geo-preview-workbench-cta">
                  <div>
                    <h3>
                      今天优先处理：<br>
                      <em>补检测、补内容、补知识库。</em>
                    </h3>
                  </div>
                  <div class="geo-preview-cta-stats">
                    <article>
                      <span>未命中待处理</span>
                      <strong>213</strong>
                    </article>
                    <article>
                      <span>待处理内容</span>
                      <strong>25</strong>
                    </article>
                    <article>
                      <span>待补资料</span>
                      <strong>180</strong>
                    </article>
                  </div>
                  <button type="button">进入内容生成</button>
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
  width: min(1680px, calc(100% - 40px));
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

.geo-preview-landing {
  position: relative;
  overflow: hidden;
  padding: 34px 64px 34px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 22%, rgb(109 40 255 / 6%), transparent 18%),
    linear-gradient(90deg, rgb(17 16 25 / 2.1%) 1px, transparent 1px) 0 0 / 64px 64px,
    linear-gradient(0deg, rgb(17 16 25 / 1.7%) 1px, transparent 1px) 0 0 / 64px 64px,
    #ffffff;
}

.geo-preview-nav {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.geo-preview-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #09080d;
  font-size: 22px;
  font-weight: 950;
  white-space: nowrap;
}

.geo-preview-logo-mark {
  display: grid;
  grid-template-columns: repeat(2, 13px);
  grid-template-rows: repeat(2, 13px);
  gap: 5px;
}

.geo-preview-logo-mark i {
  border-radius: 50%;
  background: #6d28ff;
  box-shadow: 0 0 0 1px rgb(17 16 25 / 8%);
}

.geo-preview-logo-mark i:nth-child(4) {
  background: #ffffff;
  box-shadow: inset 0 0 0 3px #6d28ff;
}

.geo-preview-nav-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 44px;
}

.geo-preview-nav-links a {
  color: #111019;
  font-size: 15px;
  font-weight: 850;
  text-decoration: none;
}

.geo-preview-nav-actions {
  display: flex;
  justify-content: flex-end !important;
  gap: 14px !important;
}

.geo-preview-nav button {
  min-height: 46px;
  padding: 0 23px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #5a20ea, #7b3cff);
  color: #ffffff;
  font-weight: 900;
  box-shadow: 0 14px 28px rgb(91 32 234 / 22%);
}

.geo-preview-nav .geo-preview-nav-login {
  border: 0;
  background: transparent;
  box-shadow: none;
  color: #111019;
}

.geo-preview-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(520px, 0.43fr) minmax(640px, 0.57fr);
  gap: 28px;
  align-items: center;
  min-height: 460px;
  padding: 58px 0 30px;
}

.geo-preview-hero-copy {
  position: relative;
  z-index: 4;
}

.geo-preview-hero-copy::after {
  content: "";
  display: none;
}

.geo-preview-hero h2 {
  margin: 8px 0 4px;
  color: #050407;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 96px;
  font-weight: 950;
  line-height: 0.95;
  white-space: nowrap;
}

.geo-preview-hero h3 {
  margin: 0;
  color: #08070b;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 40px;
  font-weight: 950;
  line-height: 1.18;
}

.geo-preview-hero h3 em {
  position: relative;
  display: inline-block;
  color: #6d28ff;
  font-style: normal;
}

.geo-preview-hero h3 em::after {
  position: absolute;
  right: -4px;
  bottom: -9px;
  left: -8px;
  height: 12px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, #baff29 0 46%, transparent 47% 51%, #baff29 52% 100%);
  content: "";
  opacity: 0.96;
  transform: rotate(-5deg);
  z-index: -1;
}

.geo-preview-hero p {
  max-width: 560px;
  margin: 28px 0 0;
  color: #6e6878;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 28px;
}

.geo-preview-actions button {
  min-width: 174px;
  min-height: 52px;
  padding: 0 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4d19e8 0%, #7b3cff 100%);
  box-shadow: 0 18px 34px rgb(91 32 234 / 22%);
}

.geo-preview-actions .geo-preview-secondary-button {
  border: 1px solid #d9d4e4;
  background: #ffffff;
  box-shadow: none;
  color: #15131d;
}

.geo-preview-hero-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 20px;
}

.geo-preview-hero-checks span {
  position: relative;
  padding-left: 18px;
  color: #81798a;
  font-size: 12px;
  font-weight: 850;
}

.geo-preview-hero-checks span::before {
  position: absolute;
  left: 0;
  color: #6d28ff;
  content: "✓";
}

.geo-preview-collage {
  position: relative;
  z-index: 2;
  min-height: 460px;
  isolation: isolate;
}

.geo-preview-collage::before {
  position: absolute;
  right: 22px;
  bottom: 48px;
  width: 470px;
  height: 205px;
  background:
    radial-gradient(circle, rgb(17 16 25 / 16%) 1px, transparent 2px) 0 0 / 9px 9px;
  content: "";
  opacity: 0.62;
  z-index: -1;
}

.geo-preview-collage-dots {
  position: absolute;
  top: 96px;
  right: 48px;
  width: 328px;
  height: 205px;
  background:
    radial-gradient(circle, #111019 1.6px, transparent 2.4px) 0 0 / 15px 15px;
  opacity: 0.27;
}

.geo-preview-collage-circle {
  position: absolute;
  top: 10px;
  right: 180px;
  width: 350px;
  height: 350px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 24%), transparent 0 13%, transparent 14%),
    radial-gradient(circle at 68% 12%, rgb(255 255 255 / 12%), transparent 0 11%, transparent 12%),
    #5f25f2;
  box-shadow: 0 40px 86px rgb(91 32 234 / 30%);
  z-index: 1;
}

.geo-preview-rock {
  position: absolute;
  background-blend-mode: multiply;
  filter: drop-shadow(0 16px 25px rgb(17 16 25 / 16%));
}

.geo-preview-rock::after {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(72deg, rgb(17 16 25 / 11%) 0 1px, transparent 1px 13px),
    linear-gradient(118deg, transparent 0 38%, rgb(255 255 255 / 40%) 39% 42%, transparent 43% 100%);
  content: "";
  mix-blend-mode: multiply;
  opacity: 0.62;
}

.geo-preview-rock-left {
  left: 48px;
  bottom: 54px;
  width: 350px;
  height: 185px;
  clip-path: polygon(0 82%, 20% 56%, 31% 66%, 48% 18%, 67% 48%, 100% 72%, 82% 100%, 22% 98%);
  background:
    linear-gradient(135deg, #f7f7f8 0 28%, #b7b6bd 29% 48%, #ffffff 49% 70%, #87868d 71% 100%);
  z-index: 2;
}

.geo-preview-rock-white {
  right: -10px;
  bottom: 48px;
  width: 430px;
  height: 312px;
  clip-path: polygon(2% 88%, 18% 32%, 34% 48%, 45% 15%, 63% 38%, 79% 24%, 100% 84%, 80% 100%, 24% 98%);
  background:
    linear-gradient(135deg, #ffffff 0 26%, #d7d6dc 27% 42%, #ffffff 43% 62%, #c4c3ca 63% 100%);
  z-index: 3;
}

.geo-preview-rock-black {
  right: 96px;
  bottom: 44px;
  width: 300px;
  height: 392px;
  clip-path: polygon(24% 0, 72% 12%, 90% 100%, 36% 94%, 0 24%);
  background:
    linear-gradient(136deg, #17141c 0 34%, #0a090d 35% 58%, #28252d 59% 100%);
  z-index: 4;
}

.geo-preview-rock-front {
  right: 300px;
  bottom: 62px;
  width: 210px;
  height: 158px;
  clip-path: polygon(3% 88%, 23% 30%, 42% 58%, 58% 26%, 98% 82%, 74% 100%, 18% 98%);
  background:
    linear-gradient(132deg, #ffffff 0 28%, #d8d8df 29% 47%, #ffffff 48% 100%);
  z-index: 6;
}

.geo-preview-brush {
  position: absolute;
  right: 52px;
  bottom: 186px;
  width: 362px;
  height: 42px;
  border-radius: 999px 26px 999px 20px;
  background:
    repeating-linear-gradient(0deg, rgb(17 16 25 / 12%) 0 1px, transparent 1px 5px),
    linear-gradient(90deg, transparent 0 4%, #baff29 5% 88%, transparent 89% 100%);
  box-shadow: 0 12px 26px rgb(186 255 41 / 30%);
  transform: rotate(-11deg);
  z-index: 8;
}

.geo-preview-fragment {
  position: absolute;
  background: #111019;
  filter: drop-shadow(0 12px 16px rgb(17 16 25 / 20%));
  z-index: 8;
}

.geo-preview-fragment-one {
  top: 126px;
  left: 332px;
  width: 92px;
  height: 74px;
  clip-path: polygon(8% 20%, 100% 8%, 86% 86%, 0 78%);
  transform: rotate(-4deg);
}

.geo-preview-fragment-two {
  right: 20px;
  bottom: 114px;
  width: 74px;
  height: 126px;
  clip-path: polygon(28% 0, 100% 24%, 78% 100%, 0 82%);
  transform: rotate(12deg);
}

.geo-preview-arrow {
  position: absolute;
  left: 46px;
  top: 158px;
  width: 236px;
  color: #baff29;
  transform: rotate(-6deg);
  z-index: 7;
}

.geo-preview-script {
  position: absolute;
  left: 82px;
  top: 104px;
  color: #6d28ff;
  font-family: "Comic Sans MS", "Bradley Hand", "Marker Felt", cursive;
  font-size: 30px;
  font-weight: 800;
  transform: rotate(-6deg);
  z-index: 9;
}

.geo-preview-ai-badge {
  position: absolute;
  right: 34px;
  top: 48px;
  display: grid;
  width: 104px;
  height: 58px;
  place-items: center;
  border: 2px solid #baff29;
  border-radius: 50%;
  color: #6d28ff;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.05;
  text-align: center;
  transform: rotate(-8deg);
  z-index: 9;
}

.geo-preview-ai-badge::before,
.geo-preview-ai-badge::after {
  position: absolute;
  inset: -7px -10px;
  border: 1px solid #baff29;
  border-radius: 50%;
  content: "";
  transform: rotate(18deg);
}

.geo-preview-ai-badge::after {
  inset: -3px -7px;
  transform: rotate(-15deg);
}

.geo-preview-vertical {
  position: absolute;
  right: -4px;
  top: 170px;
  color: #6d28ff;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0;
  writing-mode: vertical-rl;
  z-index: 9;
}

.geo-preview-vertical::after {
  display: block;
  width: 1px;
  height: 162px;
  margin: 18px auto 0;
  background: #6d28ff;
  content: "";
  opacity: 0.38;
}

.geo-preview-visibility-card {
  position: absolute;
  right: 64px;
  bottom: 62px;
  z-index: 10;
  width: 250px;
  padding: 16px 18px;
  border: 1px solid #8f78ff;
  border-radius: 5px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 14px 24px rgb(47 36 75 / 12%);
}

.geo-preview-visibility-card span {
  color: #191622;
  font-size: 12px;
  font-weight: 900;
}

.geo-preview-visibility-card strong {
  float: right;
  margin-top: 22px;
  color: #8fdc00;
  font-size: 22px;
  font-weight: 950;
}

.geo-preview-visibility-card small {
  float: right;
  clear: right;
  color: #8e8798;
  font-size: 10px;
  font-weight: 800;
}

.geo-preview-mini-line {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 128px;
  height: 44px;
  margin-top: 10px;
}

.geo-preview-mini-line i {
  display: block;
  flex: 1;
  height: 2px;
  background: #6d28ff;
  transform-origin: right center;
}

.geo-preview-mini-line i:nth-child(1) {
  transform: rotate(-18deg);
}

.geo-preview-mini-line i:nth-child(2) {
  transform: rotate(14deg);
}

.geo-preview-mini-line i:nth-child(3) {
  transform: rotate(-16deg);
}

.geo-preview-mini-line i:nth-child(4) {
  transform: rotate(12deg);
}

.geo-preview-mini-line i:nth-child(5) {
  transform: rotate(-10deg);
}

.geo-preview-mini-line i:nth-child(6) {
  transform: rotate(-18deg);
}

.geo-preview-collage-cross {
  position: absolute;
  width: 52px;
  height: 52px;
  opacity: 0.34;
  z-index: 9;
}

.geo-preview-collage-cross::before,
.geo-preview-collage-cross::after {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: #686172;
  content: "";
}

.geo-preview-collage-cross::after {
  transform: rotate(90deg);
}

.geo-preview-collage-cross-one {
  top: 10px;
  left: 308px;
}

.geo-preview-collage-cross-two {
  top: 220px;
  right: 110px;
  width: 38px;
  height: 38px;
}

.geo-preview-feature-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  overflow: hidden;
  margin-top: 8px;
  border: 1px solid #e0dce8;
  border-radius: 10px;
  background: #ffffff;
}

.geo-preview-feature-strip article {
  display: grid;
  min-height: 124px;
  padding: 22px 22px 18px;
  border-right: 1px solid #e4e0ea;
  text-align: center;
}

.geo-preview-feature-strip article:last-child {
  border-right: 0;
}

.geo-preview-feature-strip article.is-active {
  background: linear-gradient(180deg, #f4f0ff 0%, #ffffff 100%);
}

.geo-preview-feature-strip .el-icon {
  justify-self: center;
  color: #111019;
  font-size: 34px;
}

.geo-preview-feature-strip article.is-active .el-icon,
.geo-preview-feature-strip article.is-active strong {
  color: #6d28ff;
}

.geo-preview-feature-strip strong {
  margin-top: 12px;
  color: #111019;
  font-size: 17px;
  font-weight: 950;
}

.geo-preview-feature-strip p {
  margin: 6px 0 0;
  color: #777080;
  font-size: 12px;
  font-weight: 650;
}

.geo-preview-workflow {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  margin-top: 24px;
  padding: 26px 30px;
  border: 1px solid #e0dce8;
  border-radius: 10px;
  background: #ffffff;
}

.geo-preview-workflow-title {
  display: grid;
  gap: 8px;
}

.geo-preview-workflow-title strong {
  color: #111019;
  font-size: 24px;
  font-weight: 950;
  line-height: 1.1;
}

.geo-preview-workflow-title span {
  color: #111019;
  font-size: 18px;
  font-weight: 900;
}

.geo-preview-workflow-steps {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 28px;
  align-items: center;
}

.geo-preview-workflow-steps article {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
}

.geo-preview-workflow-steps article::after {
  position: absolute;
  top: 22px;
  right: -22px;
  color: #8b8493;
  content: "→";
  font-size: 22px;
  font-weight: 500;
}

.geo-preview-workflow-steps article:last-child::after {
  display: none;
}

.geo-preview-workflow-steps span {
  display: grid;
  grid-row: span 2;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 50%;
  background: #6d28ff;
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
}

.geo-preview-workflow-steps article:nth-child(even) span {
  background: #baff29;
  color: #111019;
}

.geo-preview-workflow-steps strong {
  color: #111019;
  font-size: 15px;
  font-weight: 950;
}

.geo-preview-workflow-steps p {
  margin: 0;
  color: #746d7d;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
}

.geo-preview-dark-cta {
  position: relative;
  display: grid;
  grid-template-columns: minmax(320px, 0.8fr) minmax(620px, 1fr) auto;
  gap: 34px;
  align-items: center;
  overflow: hidden;
  margin: 26px -20px -6px;
  padding: 42px 48px;
  border-radius: 4px;
  background:
    radial-gradient(circle, rgb(255 255 255 / 12%) 1px, transparent 2px) right 126px bottom 42px / 150px 86px no-repeat,
    linear-gradient(104deg, transparent 0 5%, rgb(186 255 41 / 30%) 6% 14%, transparent 15% 100%) left -12px bottom 14px / 230px 60px no-repeat,
    radial-gradient(circle at 7% 108%, rgb(109 40 255 / 84%), transparent 16%),
    radial-gradient(circle at 82% 16%, rgb(109 40 255 / 36%), transparent 26%),
    linear-gradient(135deg, #070609 0%, #131119 52%, #060508 100%);
  color: #ffffff;
}

.geo-preview-dark-cta::before {
  position: absolute;
  right: -80px;
  bottom: -72px;
  width: 300px;
  height: 230px;
  clip-path: polygon(0 90%, 22% 18%, 42% 52%, 58% 8%, 100% 82%, 76% 100%, 20% 100%);
  background: linear-gradient(135deg, #ffffff 0 34%, #bdbcc5 35% 55%, #ffffff 56% 100%);
  content: "";
  opacity: 0.92;
}

.geo-preview-dark-cta::after {
  position: absolute;
  right: 8px;
  bottom: 0;
  width: 220px;
  height: 24px;
  border-radius: 999px;
  background: #baff29;
  content: "";
  transform: rotate(-15deg);
}

.geo-preview-dark-copy,
.geo-preview-dark-cards,
.geo-preview-dark-cta button {
  position: relative;
  z-index: 2;
}

.geo-preview-dark-copy {
  position: relative;
}

.geo-preview-dark-copy::before {
  position: absolute;
  left: -42px;
  bottom: -24px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 32%, rgb(255 255 255 / 18%), transparent 0 15%, transparent 16%),
    #5f25f2;
  content: "";
  filter: blur(0.2px);
  opacity: 0.72;
  z-index: -1;
}

.geo-preview-dark-copy h2 {
  margin: 0;
  color: #ffffff;
  font-size: 38px;
  font-weight: 950;
  line-height: 1.12;
}

.geo-preview-dark-copy h2::after {
  display: block;
  width: 220px;
  height: 12px;
  margin-top: 12px;
  border-radius: 999px;
  background: #baff29;
  content: "";
  transform: rotate(5deg);
}

.geo-preview-dark-copy p {
  max-width: 470px;
  margin: 20px 0 0;
  color: rgb(255 255 255 / 72%);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-preview-dark-copy span {
  display: inline-block;
  margin-top: 20px;
  color: #6d28ff;
  font-family: "Comic Sans MS", "Bradley Hand", "Marker Felt", cursive;
  font-size: 22px;
  font-weight: 850;
  transform: rotate(-5deg);
}

.geo-preview-dark-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.geo-preview-dark-cards article {
  position: relative;
  min-height: 170px;
  padding: 22px 22px 18px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  background: linear-gradient(180deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 5%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 10%);
}

.geo-preview-dark-cards span,
.geo-preview-dark-cards small {
  color: rgb(255 255 255 / 74%);
  font-size: 13px;
  font-weight: 800;
}

.geo-preview-dark-cards strong {
  display: block;
  margin-top: 28px;
  color: #ffffff;
  font-size: 40px;
  font-weight: 950;
  line-height: 1;
}

.geo-preview-dark-cards article:nth-child(2) strong {
  color: #baff29;
}

.geo-preview-dark-cards article:nth-child(3) strong {
  color: #d7c8ff;
}

.geo-preview-dark-cards i {
  position: absolute;
  right: 20px;
  bottom: 22px;
  left: 72px;
  height: 28px;
  border-bottom: 2px solid #6d28ff;
  border-radius: 50%;
}

.geo-preview-dark-cards article:nth-child(2) i {
  border-bottom-color: #baff29;
}

.geo-preview-dark-cards article:nth-child(3) i {
  border-bottom-color: #9b7cff;
}

.geo-preview-dark-cta button {
  min-width: 148px;
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  background: #baff29;
  color: #111019;
  font-weight: 950;
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
  grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
  gap: 28px;
  align-items: center;
  padding: clamp(24px, 3vw, 46px);
  border: 1px solid #e5e0ef;
  border-radius: 24px;
  background:
    radial-gradient(circle at 86% 18%, rgb(109 40 255 / 8%), transparent 24%),
    linear-gradient(90deg, rgb(17 16 25 / 2%) 1px, transparent 1px) 0 0 / 56px 56px,
    linear-gradient(0deg, rgb(17 16 25 / 1.5%) 1px, transparent 1px) 0 0 / 56px 56px,
    #ffffff;
}

.geo-preview-login-copy {
  position: relative;
  display: grid;
  align-content: center;
  overflow: hidden;
  min-height: 620px;
  padding: clamp(34px, 4vw, 58px);
  border-radius: 22px;
  background:
    radial-gradient(circle at 18% 105%, rgb(109 40 255 / 68%), transparent 23%),
    radial-gradient(circle at 78% 12%, rgb(109 40 255 / 42%), transparent 28%),
    linear-gradient(135deg, #08070b 0%, #16111f 58%, #08070b 100%);
  color: #fff;
  isolation: isolate;
}

.geo-preview-login-copy::after {
  position: absolute;
  right: -40px;
  bottom: -42px;
  width: 245px;
  height: 170px;
  clip-path: polygon(0 88%, 20% 16%, 40% 54%, 58% 5%, 100% 82%, 76% 100%, 18% 100%);
  background:
    linear-gradient(135deg, #ffffff 0 34%, #bbb9c5 35% 54%, #ffffff 55% 100%);
  content: "";
  opacity: 0.84;
  z-index: -1;
}

.geo-preview-login-copy > :not(.geo-preview-login-grid):not(.geo-preview-login-orb):not(.geo-preview-login-slab):not(.geo-preview-login-brush) {
  position: relative;
  z-index: 2;
}

.geo-preview-login-copy h2 {
  color: #fff;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: clamp(54px, 5vw, 82px);
  line-height: 0.96;
}

.geo-preview-login-copy h3 {
  margin: 6px 0 0;
  color: #ffffff;
  font-size: clamp(26px, 2.4vw, 38px);
  font-weight: 950;
  line-height: 1.18;
}

.geo-preview-login-lede {
  max-width: 620px;
  margin: 22px 0 0;
  color: rgb(255 255 255 / 70%);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.8;
}

.geo-preview-login-copy ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 640px;
  margin: 30px 0 0;
  padding: 0;
  list-style: none;
}

.geo-preview-login-copy li {
  position: relative;
  padding: 14px 15px 14px 35px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 12px;
  background: rgb(255 255 255 / 7%);
  color: #fff;
  font-weight: 750;
}

.geo-preview-login-copy li::before {
  position: absolute;
  top: 17px;
  left: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #baff29;
  box-shadow: 0 0 18px rgb(186 255 41 / 58%);
  content: "";
}

.geo-preview-login-grid {
  position: absolute;
  right: 34px;
  bottom: 70px;
  width: 270px;
  height: 180px;
  background:
    radial-gradient(circle, rgb(255 255 255 / 24%) 1.5px, transparent 2.4px) 0 0 / 16px 16px;
  opacity: 0.28;
  z-index: -2;
}

.geo-preview-login-orb {
  position: absolute;
  top: 72px;
  right: 84px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 30%, rgb(255 255 255 / 20%), transparent 0 15%, transparent 16%),
    #5f25f2;
  box-shadow: 0 38px 76px rgb(95 31 226 / 34%);
  z-index: -2;
}

.geo-preview-login-slab {
  position: absolute;
  top: 146px;
  right: 40px;
  width: 176px;
  height: 154px;
  clip-path: polygon(18% 0, 94% 20%, 84% 100%, 0 78%);
  background: linear-gradient(135deg, #1b1722 0%, #08070b 100%);
  filter: drop-shadow(0 20px 32px rgb(0 0 0 / 28%));
  transform: rotate(11deg);
  z-index: -1;
}

.geo-preview-login-brush {
  position: absolute;
  right: 78px;
  bottom: 184px;
  width: 240px;
  height: 28px;
  border-radius: 999px;
  background:
    repeating-linear-gradient(0deg, rgb(17 16 25 / 14%) 0 1px, transparent 1px 5px),
    linear-gradient(90deg, transparent 0 5%, #baff29 6% 90%, transparent 91% 100%);
  transform: rotate(-12deg);
  z-index: 1;
}

.geo-preview-login-signal {
  display: inline-grid;
  gap: 7px;
  width: fit-content;
  margin-top: 34px;
  padding: 14px 18px;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 999px;
  background: rgb(255 255 255 / 8%);
}

.geo-preview-login-signal span {
  color: #baff29;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.geo-preview-login-signal strong {
  color: #ffffff;
  font-size: 14px;
}

.geo-preview-login-card {
  display: grid;
  gap: 16px;
  max-width: 500px;
  margin: 0 auto;
  padding: clamp(28px, 3vw, 42px);
  border: 1px solid #e5e0ef;
  border-radius: 22px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 28px 80px rgb(24 20 36 / 12%);
}

.geo-preview-login-card h2 {
  margin: 0;
  color: #111019;
  font-size: 34px;
  font-weight: 950;
}

.geo-preview-login-card-copy {
  max-width: 360px;
  color: #706879;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-preview-login-card label {
  display: grid;
  gap: 9px;
  color: #332d3d;
  font-weight: 850;
}

.geo-preview-login-card input {
  height: 46px;
  padding: 0 14px;
  border: 1px solid #ded8eb;
  border-radius: 10px;
  background: #fbfaff;
  color: #17131f;
  font: inherit;
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
  gap: 8px !important;
  color: #5f576b !important;
  font-size: 13px;
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
  height: 48px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #4d19e8 0%, #7b3cff 100%);
  color: #fff;
  font-weight: 900;
  box-shadow: 0 18px 34px rgb(91 32 234 / 24%);
}

.geo-preview-login-status {
  padding-top: 14px;
  border-top: 1px solid #eee9f5;
  color: #716a7e;
  font-size: 12px;
  font-weight: 700;
}

.geo-preview-login-status span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.geo-preview-login-status i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #baff29;
  box-shadow: 0 0 14px rgb(186 255 41 / 62%);
}

.geo-preview-dashboard.geo-preview-workbench {
  display: grid;
  grid-template-columns: 276px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #ded8eb;
  border-radius: 18px;
  background: #f6f5fa;
  box-shadow: 0 24px 70px rgb(24 20 36 / 9%);
}

.geo-preview-sidebar {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  min-height: 910px;
  padding: 24px 12px 18px;
  background:
    radial-gradient(circle at 18% 3%, rgb(109 40 255 / 34%), transparent 26%),
    radial-gradient(circle at 96% 82%, rgb(109 40 255 / 28%), transparent 24%),
    linear-gradient(180deg, #050508 0%, #101016 56%, #050508 100%);
  color: #ffffff;
  isolation: isolate;
}

.geo-preview-sidebar::before {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle, rgb(255 255 255 / 18%) 1px, transparent 2px) 78% 8% / 17px 17px,
    radial-gradient(circle, rgb(255 255 255 / 10%) 1px, transparent 2px) 10% 82% / 14px 14px;
  content: "";
  opacity: 0.38;
  z-index: -1;
}

.geo-preview-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0 14px 24px;
}

.geo-preview-sidebar-logo {
  display: grid;
  grid-template-columns: repeat(2, 11px);
  gap: 5px;
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.geo-preview-sidebar-logo i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #6d28ff;
}

.geo-preview-sidebar-logo i:nth-child(4) {
  background: #ffffff;
}

.geo-preview-sidebar-brand strong {
  color: #ffffff;
  font-size: 20px;
  font-weight: 950;
}

.geo-preview-sidebar nav {
  position: relative;
  display: grid;
  gap: 7px;
  z-index: 1;
}

.geo-preview-sidebar nav a {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 44px;
  padding: 0 13px;
  border-radius: 9px;
  color: rgb(255 255 255 / 78%);
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

.geo-preview-sidebar nav a .el-icon {
  color: inherit;
  font-size: 19px;
}

.geo-preview-sidebar nav a.is-active {
  background: linear-gradient(135deg, #5d20f5 0%, #7d37ff 56%, #5f25f2 100%);
  box-shadow: 0 14px 28px rgb(93 32 245 / 32%);
  color: #ffffff;
}

.geo-preview-sidebar-user {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-top: auto;
  padding: 16px 10px 0;
  border-top: 1px solid rgb(255 255 255 / 12%);
  z-index: 1;
}

.geo-preview-user-dot {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  color: #111019 !important;
  font-weight: 950;
}

.geo-preview-sidebar-user strong {
  display: block;
  color: #ffffff;
  font-size: 13px;
}

.geo-preview-sidebar-user small {
  color: rgb(255 255 255 / 58%);
  font-size: 11px;
}

.geo-preview-main {
  min-width: 0;
  background:
    radial-gradient(circle at 92% 4%, rgb(109 40 255 / 5%), transparent 24%),
    #fbfbfd;
}

.geo-preview-main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 72px;
  padding: 0 30px;
  border-bottom: 1px solid #e8e2f2;
  background: rgb(255 255 255 / 92%);
}

.geo-preview-main-header h2 {
  margin: 0 0 4px;
  color: #111019;
  font-size: 24px;
  font-weight: 950;
}

.geo-preview-main-header > div:first-child span {
  color: #736d7d;
  font-size: 13px;
  font-weight: 700;
}

.geo-preview-header-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.geo-preview-header-status span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid #e3ddec;
  border-radius: 999px;
  background: #ffffff;
  color: #5d5669;
  font-size: 12px;
  font-weight: 850;
}

.geo-preview-header-status span i,
.geo-preview-system-list i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #baff29;
  box-shadow: 0 0 14px rgb(186 255 41 / 58%);
}

.geo-preview-header-status button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  border: 1px solid #e3ddec;
  border-radius: 50%;
  background: #ffffff;
  color: #111019;
  font-weight: 950;
}

.geo-preview-header-status .geo-preview-header-user {
  border-color: #111019;
  background: #111019;
  color: #ffffff;
}

.geo-preview-main-content {
  display: grid;
  gap: 18px;
  padding: 26px 30px 30px;
}

.geo-preview-workbench-hero,
.geo-preview-action-grid article,
.geo-preview-core-grid article,
.geo-preview-card {
  border: 1px solid #e1dce9;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgb(35 30 48 / 4%);
}

.geo-preview-workbench-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
}

.geo-preview-workbench-hero h3 {
  margin: 4px 0;
  color: #050407;
  font-size: 38px;
  font-weight: 950;
  line-height: 1;
}

.geo-preview-workbench-hero strong {
  display: block;
  margin-bottom: 8px;
  color: #111019;
  font-size: 18px;
  font-weight: 950;
}

.geo-preview-workbench-hero span {
  color: #736d7d;
  font-size: 14px;
  font-weight: 650;
}

.geo-preview-workbench-hero button,
.geo-preview-action-grid button,
.geo-preview-queue-list button,
.geo-preview-workbench-cta button {
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #5d20f5 0%, #7b3cff 100%);
  color: #ffffff;
  font-weight: 900;
}

.geo-preview-workbench-hero button {
  min-width: 128px;
  min-height: 44px;
}

.geo-preview-action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.geo-preview-action-grid article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 154px;
  padding: 20px;
}

.geo-preview-action-grid article.is-accent {
  border-color: #d7fb64;
  background: linear-gradient(135deg, #f7ffe9 0%, #ffffff 68%);
}

.geo-preview-action-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 12px;
  background: #f0e9ff;
  color: #6d28ff;
  font-size: 24px;
}

.geo-preview-action-grid article.is-accent .geo-preview-action-icon {
  background: #baff29;
  color: #111019;
}

.geo-preview-action-grid strong {
  display: block;
  color: #111019;
  font-size: 18px;
  font-weight: 950;
}

.geo-preview-action-grid p {
  margin: 8px 0 0;
  color: #665f70;
  font-size: 14px;
  font-weight: 750;
}

.geo-preview-action-grid button {
  grid-column: 1 / -1;
  justify-self: start;
  min-height: 38px;
  padding: 0 14px;
}

.geo-preview-action-grid article.is-plain button {
  border: 1px solid #d8d1e5;
  background: #ffffff;
  color: #111019;
}

.geo-preview-core-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.geo-preview-core-grid article {
  min-height: 128px;
  padding: 20px;
}

.geo-preview-core-grid span,
.geo-preview-card-header span,
.geo-preview-suggestion-card small,
.geo-preview-system-list span {
  color: #736d7d;
  font-size: 12px;
  font-weight: 800;
}

.geo-preview-core-grid strong {
  display: block;
  margin: 14px 0 8px;
  color: #050407;
  font-size: 34px;
  font-weight: 950;
  line-height: 1;
}

.geo-preview-core-grid small {
  color: #665f70;
  font-size: 12px;
  font-weight: 750;
}

.geo-preview-workbench-grid {
  display: grid;
  grid-template-columns: minmax(420px, 1.3fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: stretch;
}

.geo-preview-card {
  padding: 20px;
}

.geo-preview-card-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.geo-preview-card-header h3 {
  margin: 0 0 5px;
  color: #111019;
  font-size: 19px;
  font-weight: 950;
}

.geo-preview-queue-card {
  grid-row: span 2;
}

.geo-preview-queue-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.geo-preview-queue-list article {
  display: grid;
  gap: 12px;
  min-height: 128px;
  padding: 16px;
  border: 1px solid #ece7f2;
  border-radius: 10px;
  background: #fbfaff;
}

.geo-preview-queue-list article.is-good {
  border-color: #dcf7a2;
  background: #f9ffe9;
}

.geo-preview-queue-list article.is-danger {
  border-color: #ead9ff;
  background: #f7f1ff;
}

.geo-preview-queue-list strong {
  display: block;
  color: #111019;
  font-size: 15px;
  font-weight: 950;
}

.geo-preview-queue-list span {
  display: block;
  margin-top: 8px;
  color: #655e6f;
  font-size: 13px;
  font-weight: 800;
}

.geo-preview-queue-list button {
  justify-self: start;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #d8d1e5;
  background: #ffffff;
  color: #6d28ff;
}

.geo-preview-suggestion-card ul {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.geo-preview-suggestion-card li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.geo-preview-suggestion-card li > span {
  width: 9px;
  height: 9px;
  margin-top: 6px;
  border-radius: 50%;
  background: #baff29;
}

.geo-preview-suggestion-card li:nth-child(n + 2) > span {
  background: #6d28ff;
}

.geo-preview-suggestion-card strong {
  display: block;
  color: #221c2d;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.45;
}

.geo-preview-quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.geo-preview-quick-grid button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid #e1dce9;
  border-radius: 9px;
  background: #fbfaff;
  color: #221c2d;
  font-weight: 850;
}

.geo-preview-quick-grid .el-icon {
  color: #6d28ff;
  font-size: 18px;
}

.geo-preview-system-list {
  display: grid;
  gap: 10px;
}

.geo-preview-system-list span {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 32px;
}

.geo-preview-workbench-cta {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(420px, 1fr) auto;
  gap: 22px;
  align-items: center;
  overflow: hidden;
  padding: 24px 28px;
  border-radius: 12px;
  background:
    radial-gradient(circle, rgb(255 255 255 / 10%) 1px, transparent 2px) right 24px top 20px / 110px 70px no-repeat,
    linear-gradient(135deg, #070609 0%, #15121b 58%, #08070b 100%);
  color: #ffffff;
}

.geo-preview-workbench-cta h3 {
  margin: 0;
  color: #ffffff;
  font-size: 23px;
  font-weight: 950;
  line-height: 1.42;
}

.geo-preview-workbench-cta em {
  color: #baff29;
  font-style: normal;
}

.geo-preview-cta-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
}

.geo-preview-cta-stats article {
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 0 16px;
  border-left: 1px solid rgb(255 255 255 / 20%);
}

.geo-preview-cta-stats article:last-child {
  border-right: 1px solid rgb(255 255 255 / 20%);
}

.geo-preview-cta-stats span {
  color: rgb(255 255 255 / 68%);
  font-size: 12px;
  font-weight: 850;
}

.geo-preview-cta-stats strong {
  color: #ffffff;
  font-size: 30px;
  font-weight: 950;
}

.geo-preview-workbench-cta button {
  min-width: 138px;
  min-height: 48px;
  background: #baff29;
  color: #111019;
}

@media (max-width: 980px) {
  .geo-preview-header,
  .geo-preview-hero,
  .geo-preview-login,
  .geo-preview-dashboard,
  .geo-preview-workbench-grid,
  .geo-preview-workbench-cta,
  .geo-preview-workflow,
  .geo-preview-dark-cta {
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

  .geo-preview-landing {
    padding: 26px 28px 30px;
  }

  .geo-preview-hero {
    min-height: auto;
  }

  .geo-preview-hero h2 {
    font-size: 72px;
  }

  .geo-preview-collage {
    min-height: 430px;
  }

  .geo-preview-feature-strip,
  .geo-preview-workflow-steps,
  .geo-preview-dark-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-preview-feature-strip article {
    border-bottom: 1px solid #e4e0ea;
  }

  .geo-preview-workflow-steps article::after {
    display: none;
  }

  .geo-preview-capabilities,
  .geo-preview-metrics,
  .geo-preview-action-grid,
  .geo-preview-core-grid,
  .geo-preview-queue-list,
  .geo-preview-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-preview-sidebar {
    min-height: auto;
  }

  .geo-preview-sidebar nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .geo-preview-shell {
    width: min(100% - 24px, 1680px);
  }

  .geo-preview-tabs :deep(.el-tabs__content) {
    padding: 14px;
  }

  .geo-preview-header h1,
  .geo-preview-hero h2,
  .geo-preview-login-copy h2 {
    font-size: 34px;
  }

  .geo-preview-landing {
    padding: 18px;
  }

  .geo-preview-nav-links,
  .geo-preview-nav-actions {
    gap: 10px !important;
  }

  .geo-preview-hero {
    padding-top: 34px;
  }

  .geo-preview-hero h2 {
    font-size: 50px;
  }

  .geo-preview-hero h3 {
    font-size: 28px;
  }

  .geo-preview-hero-copy::after {
    display: none;
  }

  .geo-preview-collage {
    min-height: 370px;
    transform: scale(0.88);
    transform-origin: top left;
  }

  .geo-preview-feature-strip,
  .geo-preview-workflow-steps,
  .geo-preview-dark-cards {
    grid-template-columns: 1fr;
  }

  .geo-preview-dark-cta {
    margin-right: 0;
    margin-left: 0;
    padding: 26px;
  }

  .geo-preview-workstation-grid,
  .geo-preview-capabilities,
  .geo-preview-metrics,
  .geo-preview-action-grid,
  .geo-preview-core-grid,
  .geo-preview-queue-list,
  .geo-preview-quick-grid,
  .geo-preview-cta-stats,
  .geo-preview-flow {
    grid-template-columns: 1fr;
  }

  .geo-preview-login,
  .geo-preview-main-header,
  .geo-preview-workbench-hero {
    padding: 18px;
  }

  .geo-preview-main-content {
    padding: 18px;
  }

  .geo-preview-main-header,
  .geo-preview-workbench-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .geo-preview-sidebar nav {
    grid-template-columns: 1fr;
  }

  .geo-preview-workbench-cta {
    padding: 22px;
  }

  .geo-preview-cta-stats article,
  .geo-preview-cta-stats article:last-child {
    align-items: start;
    justify-items: start;
    border-right: 0;
    border-left: 0;
  }
}
</style>

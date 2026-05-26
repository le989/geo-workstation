<script setup lang="ts">
import {
  CollectionTag,
  EditPen,
  Files,
  PieChart,
  Search,
  Setting,
  TrendCharts
} from "@element-plus/icons-vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

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
</script>

<template>
  <main class="geo-landing-page">
    <section class="geo-landing-shell">
      <nav class="geo-landing-nav" aria-label="产品首页导航">
        <RouterLink class="geo-landing-nav-brand" to="/">
          <span class="geo-landing-logo-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          GEO 工作站
        </RouterLink>
        <div class="geo-landing-nav-links">
          <a href="#capabilities">产品能力</a>
          <a href="#workflow">工作流程</a>
          <a href="#deploy">本地部署</a>
          <a href="#help">使用帮助</a>
        </div>
        <div class="geo-landing-nav-actions">
          <RouterLink class="geo-landing-nav-login" to="/login">登录</RouterLink>
        </div>
      </nav>

      <section class="geo-landing-hero">
        <div class="geo-landing-hero-copy">
          <p class="geo-landing-kicker">GEO SEARCH VISIBILITY</p>
          <h1>GEO 工作站</h1>
          <h2>
            让 <em>AI 搜索看见你</em>，<br>
            信任你，引用你。
          </h2>
          <p>
            一站式 GEO 运营平台，覆盖诊断、策略、资产、内容生成、检测和复盘，构建可被 AI 信任与引用的内容体系。
          </p>
          <div class="geo-landing-actions">
            <RouterLink class="geo-landing-primary-button" to="/login">进入工作站</RouterLink>
            <a class="geo-landing-secondary-button" href="#workflow">查看工作流程</a>
          </div>
          <div class="geo-landing-hero-checks" aria-label="产品边界提示">
            <span>{{ appStore.environmentLabel }}</span>
            <span>事实人工确认</span>
            <span>不展示密钥</span>
          </div>
        </div>

        <div class="geo-landing-collage" aria-label="GEO 首页 collage 视觉">
          <div class="geo-landing-collage-dots" />
          <div class="geo-landing-collage-cross geo-landing-collage-cross-one" />
          <div class="geo-landing-collage-cross geo-landing-collage-cross-two" />
          <div class="geo-landing-collage-circle" />
          <div class="geo-landing-rock geo-landing-rock-left" />
          <div class="geo-landing-rock geo-landing-rock-white" />
          <div class="geo-landing-rock geo-landing-rock-black" />
          <div class="geo-landing-rock geo-landing-rock-front" />
          <div class="geo-landing-brush" />
          <div class="geo-landing-fragment geo-landing-fragment-one" />
          <div class="geo-landing-fragment geo-landing-fragment-two" />
          <svg class="geo-landing-arrow" viewBox="0 0 260 150" aria-hidden="true">
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
          <div class="geo-landing-script">Search Everywhere.</div>
          <div class="geo-landing-ai-badge">AI<br>Visibility</div>
          <div class="geo-landing-vertical">GEO WORKSTATION</div>
          <article class="geo-landing-visibility-card">
            <span>品牌可见度</span>
            <div class="geo-landing-mini-line" aria-hidden="true">
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

      <section id="capabilities" class="geo-landing-feature-strip">
        <article v-for="item in capabilityCards" :key="item.title" :class="{ 'is-active': item.active }">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <strong>{{ item.title }}</strong>
          <p>{{ item.copy }}</p>
        </article>
      </section>

      <section id="workflow" class="geo-landing-workflow">
        <div class="geo-landing-workflow-title">
          <strong>从洞察到增长</strong>
          <span>闭环驱动可见度提升</span>
        </div>
        <div class="geo-landing-workflow-steps">
          <article v-for="(step, index) in workflowSteps" :key="step.title">
            <span>{{ String(index + 1).padStart(2, "0") }}</span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.copy }}</p>
          </article>
        </div>
      </section>

      <section id="deploy" class="geo-landing-dark-cta">
        <div class="geo-landing-dark-copy">
          <h2>
            让 AI 更懂你，<br>
            让世界更容易找到你。
          </h2>
          <p>
            GEO 工作站帮助你建立可被 AI 理解、信任并引用的内容体系，在每一次 AI 搜索与回答中，占据更靠前的位置。
          </p>
          <span>GEO visibility system</span>
        </div>
        <div class="geo-landing-dark-cards">
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
            <small>低价值内容减少</small>
            <i aria-hidden="true" />
          </article>
        </div>
        <RouterLink class="geo-landing-dark-button" to="/login">登录工作站</RouterLink>
      </section>

      <aside id="help" class="geo-landing-boundary">
        联网 Provider 结果不等同于 App 端真实用户结果；发布内容和参数事实仍需人工确认。
      </aside>
    </section>
  </main>
</template>

<style scoped>
.geo-landing-page {
  min-height: 100vh;
  padding: 24px 0 42px;
  background:
    radial-gradient(circle at 77% 15%, rgb(109 40 255 / 7%), transparent 21%),
    linear-gradient(90deg, rgb(17 16 25 / 1.8%) 1px, transparent 1px) 0 0 / 68px 68px,
    linear-gradient(0deg, rgb(17 16 25 / 1.4%) 1px, transparent 1px) 0 0 / 68px 68px,
    #ffffff;
}

.geo-landing-shell {
  width: min(1680px, calc(100% - 40px));
  margin: 0 auto;
  padding: 34px 64px 34px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 22%, rgb(109 40 255 / 6%), transparent 18%),
    #ffffff;
  box-shadow: 0 24px 80px rgb(24 20 37 / 7%);
  overflow: hidden;
}

.geo-landing-nav {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
}

.geo-landing-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #09080d;
  font-size: 22px;
  font-weight: 950;
  text-decoration: none;
  white-space: nowrap;
}

.geo-landing-logo-mark {
  display: grid;
  grid-template-columns: repeat(2, 13px);
  grid-template-rows: repeat(2, 13px);
  gap: 5px;
}

.geo-landing-logo-mark i {
  border-radius: 50%;
  background: #6d28ff;
  box-shadow: 0 0 0 1px rgb(17 16 25 / 8%);
}

.geo-landing-logo-mark i:nth-child(4) {
  background: #ffffff;
  box-shadow: inset 0 0 0 3px #6d28ff;
}

.geo-landing-nav-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 44px;
}

.geo-landing-nav-links a,
.geo-landing-nav-login {
  color: #111019;
  font-size: 15px;
  font-weight: 850;
  text-decoration: none;
}

.geo-landing-nav-actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.geo-landing-primary-button,
.geo-landing-secondary-button,
.geo-landing-dark-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.geo-landing-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(520px, 0.43fr) minmax(640px, 0.57fr);
  gap: 28px;
  align-items: center;
  min-height: 460px;
  padding: 58px 0 30px;
}

.geo-landing-hero-copy {
  position: relative;
  z-index: 4;
}

.geo-landing-kicker {
  margin: 0;
  color: #6d28ff;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

.geo-landing-hero h1 {
  margin: 8px 0 4px;
  color: #050407;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 96px;
  font-weight: 950;
  line-height: 0.95;
  white-space: nowrap;
}

.geo-landing-hero h2 {
  margin: 0;
  color: #08070b;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 40px;
  font-weight: 950;
  line-height: 1.18;
}

.geo-landing-hero h2 em {
  position: relative;
  display: inline-block;
  color: #6d28ff;
  font-style: normal;
}

.geo-landing-hero h2 em::after {
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

.geo-landing-hero-copy > p:not(.geo-landing-kicker) {
  max-width: 560px;
  margin: 28px 0 0;
  color: #6e6878;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 28px;
}

.geo-landing-primary-button,
.geo-landing-secondary-button {
  min-width: 174px;
  min-height: 52px;
  padding: 0 26px;
  border-radius: 8px;
  font-weight: 950;
}

.geo-landing-primary-button {
  background: linear-gradient(135deg, #4d19e8 0%, #7b3cff 100%);
  color: #ffffff;
  box-shadow: 0 18px 34px rgb(91 32 234 / 22%);
}

.geo-landing-secondary-button {
  border: 1px solid #d9d4e4;
  background: #ffffff;
  color: #15131d;
}

.geo-landing-hero-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 20px;
}

.geo-landing-hero-checks span {
  position: relative;
  padding-left: 18px;
  color: #81798a;
  font-size: 12px;
  font-weight: 850;
}

.geo-landing-hero-checks span::before {
  position: absolute;
  left: 0;
  color: #6d28ff;
  content: "✓";
}

.geo-landing-collage {
  position: relative;
  z-index: 2;
  min-height: 460px;
  isolation: isolate;
}

.geo-landing-collage::before {
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

.geo-landing-collage-dots {
  position: absolute;
  top: 96px;
  right: 48px;
  width: 328px;
  height: 205px;
  background:
    radial-gradient(circle, #111019 1.6px, transparent 2.4px) 0 0 / 15px 15px;
  opacity: 0.27;
}

.geo-landing-collage-circle {
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

.geo-landing-rock {
  position: absolute;
  background-blend-mode: multiply;
  filter: drop-shadow(0 16px 25px rgb(17 16 25 / 16%));
}

.geo-landing-rock::after {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(72deg, rgb(17 16 25 / 11%) 0 1px, transparent 1px 13px),
    linear-gradient(118deg, transparent 0 38%, rgb(255 255 255 / 40%) 39% 42%, transparent 43% 100%);
  content: "";
  mix-blend-mode: multiply;
  opacity: 0.62;
}

.geo-landing-rock-left {
  left: 48px;
  bottom: 54px;
  width: 350px;
  height: 185px;
  clip-path: polygon(0 82%, 20% 56%, 31% 66%, 48% 18%, 67% 48%, 100% 72%, 82% 100%, 22% 98%);
  background:
    linear-gradient(135deg, #f7f7f8 0 28%, #b7b6bd 29% 48%, #ffffff 49% 70%, #87868d 71% 100%);
  z-index: 2;
}

.geo-landing-rock-white {
  right: -10px;
  bottom: 48px;
  width: 430px;
  height: 312px;
  clip-path: polygon(2% 88%, 18% 32%, 34% 48%, 45% 15%, 63% 38%, 79% 24%, 100% 84%, 80% 100%, 24% 98%);
  background:
    linear-gradient(135deg, #ffffff 0 26%, #d7d6dc 27% 42%, #ffffff 43% 62%, #c4c3ca 63% 100%);
  z-index: 3;
}

.geo-landing-rock-black {
  right: 96px;
  bottom: 44px;
  width: 300px;
  height: 392px;
  clip-path: polygon(24% 0, 72% 12%, 90% 100%, 36% 94%, 0 24%);
  background:
    linear-gradient(136deg, #17141c 0 34%, #0a090d 35% 58%, #28252d 59% 100%);
  z-index: 4;
}

.geo-landing-rock-front {
  right: 300px;
  bottom: 62px;
  width: 210px;
  height: 158px;
  clip-path: polygon(3% 88%, 23% 30%, 42% 58%, 58% 26%, 98% 82%, 74% 100%, 18% 98%);
  background:
    linear-gradient(132deg, #ffffff 0 28%, #d8d8df 29% 47%, #ffffff 48% 100%);
  z-index: 6;
}

.geo-landing-brush {
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

.geo-landing-fragment {
  position: absolute;
  background: #111019;
  filter: drop-shadow(0 12px 16px rgb(17 16 25 / 20%));
  z-index: 8;
}

.geo-landing-fragment-one {
  top: 126px;
  left: 332px;
  width: 92px;
  height: 74px;
  clip-path: polygon(8% 20%, 100% 8%, 86% 86%, 0 78%);
  transform: rotate(-4deg);
}

.geo-landing-fragment-two {
  right: 20px;
  bottom: 114px;
  width: 74px;
  height: 126px;
  clip-path: polygon(28% 0, 100% 24%, 78% 100%, 0 82%);
  transform: rotate(12deg);
}

.geo-landing-arrow {
  position: absolute;
  left: 46px;
  top: 158px;
  width: 236px;
  color: #baff29;
  transform: rotate(-6deg);
  z-index: 7;
}

.geo-landing-script {
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

.geo-landing-ai-badge {
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

.geo-landing-ai-badge::before,
.geo-landing-ai-badge::after {
  position: absolute;
  inset: -7px -10px;
  border: 1px solid #baff29;
  border-radius: 50%;
  content: "";
  transform: rotate(18deg);
}

.geo-landing-ai-badge::after {
  inset: -3px -7px;
  transform: rotate(-15deg);
}

.geo-landing-vertical {
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

.geo-landing-vertical::after {
  display: block;
  width: 1px;
  height: 162px;
  margin: 18px auto 0;
  background: #6d28ff;
  content: "";
  opacity: 0.38;
}

.geo-landing-visibility-card {
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

.geo-landing-visibility-card span {
  color: #191622;
  font-size: 12px;
  font-weight: 900;
}

.geo-landing-visibility-card strong {
  float: right;
  margin-top: 22px;
  color: #8fdc00;
  font-size: 22px;
  font-weight: 950;
}

.geo-landing-visibility-card small {
  float: right;
  clear: right;
  color: #8e8798;
  font-size: 10px;
  font-weight: 800;
}

.geo-landing-mini-line {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 128px;
  height: 44px;
  margin-top: 10px;
}

.geo-landing-mini-line i {
  display: block;
  flex: 1;
  height: 2px;
  background: #6d28ff;
  transform-origin: right center;
}

.geo-landing-mini-line i:nth-child(1) {
  transform: rotate(-18deg);
}

.geo-landing-mini-line i:nth-child(2) {
  transform: rotate(14deg);
}

.geo-landing-mini-line i:nth-child(3) {
  transform: rotate(-16deg);
}

.geo-landing-mini-line i:nth-child(4) {
  transform: rotate(12deg);
}

.geo-landing-mini-line i:nth-child(5) {
  transform: rotate(-10deg);
}

.geo-landing-mini-line i:nth-child(6) {
  transform: rotate(-18deg);
}

.geo-landing-collage-cross {
  position: absolute;
  width: 52px;
  height: 52px;
  opacity: 0.34;
  z-index: 9;
}

.geo-landing-collage-cross::before,
.geo-landing-collage-cross::after {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: #686172;
  content: "";
}

.geo-landing-collage-cross::after {
  transform: rotate(90deg);
}

.geo-landing-collage-cross-one {
  top: 10px;
  left: 308px;
}

.geo-landing-collage-cross-two {
  top: 220px;
  right: 110px;
  width: 38px;
  height: 38px;
}

.geo-landing-feature-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  overflow: hidden;
  margin-top: 8px;
  border: 1px solid #e0dce8;
  border-radius: 10px;
  background: #ffffff;
}

.geo-landing-feature-strip article {
  display: grid;
  min-height: 124px;
  padding: 22px 22px 18px;
  border-right: 1px solid #e4e0ea;
  text-align: center;
}

.geo-landing-feature-strip article:last-child {
  border-right: 0;
}

.geo-landing-feature-strip article.is-active {
  background: linear-gradient(180deg, #f4f0ff 0%, #ffffff 100%);
}

.geo-landing-feature-strip .el-icon {
  justify-self: center;
  color: #111019;
  font-size: 34px;
}

.geo-landing-feature-strip article.is-active .el-icon,
.geo-landing-feature-strip article.is-active strong {
  color: #6d28ff;
}

.geo-landing-feature-strip strong {
  margin-top: 12px;
  color: #111019;
  font-size: 17px;
  font-weight: 950;
}

.geo-landing-feature-strip p {
  margin: 6px 0 0;
  color: #777080;
  font-size: 12px;
  font-weight: 650;
}

.geo-landing-workflow {
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

.geo-landing-workflow-title {
  display: grid;
  gap: 8px;
}

.geo-landing-workflow-title strong {
  color: #111019;
  font-size: 24px;
  font-weight: 950;
  line-height: 1.1;
}

.geo-landing-workflow-title span {
  color: #111019;
  font-size: 18px;
  font-weight: 900;
}

.geo-landing-workflow-steps {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 28px;
  align-items: center;
}

.geo-landing-workflow-steps article {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
}

.geo-landing-workflow-steps article::after {
  position: absolute;
  top: 22px;
  right: -22px;
  color: #8b8493;
  content: "→";
  font-size: 22px;
  font-weight: 500;
}

.geo-landing-workflow-steps article:last-child::after {
  display: none;
}

.geo-landing-workflow-steps span {
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

.geo-landing-workflow-steps article:nth-child(even) span {
  background: #baff29;
  color: #111019;
}

.geo-landing-workflow-steps strong {
  color: #111019;
  font-size: 15px;
  font-weight: 950;
}

.geo-landing-workflow-steps p {
  margin: 0;
  color: #746d7d;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
}

.geo-landing-dark-cta {
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

.geo-landing-dark-cta::before {
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

.geo-landing-dark-cta::after {
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

.geo-landing-dark-copy,
.geo-landing-dark-cards,
.geo-landing-dark-button {
  position: relative;
  z-index: 2;
}

.geo-landing-dark-copy {
  position: relative;
}

.geo-landing-dark-copy::before {
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

.geo-landing-dark-copy h2 {
  margin: 0;
  color: #ffffff;
  font-size: 38px;
  font-weight: 950;
  line-height: 1.12;
}

.geo-landing-dark-copy h2::after {
  display: block;
  width: 220px;
  height: 12px;
  margin-top: 12px;
  border-radius: 999px;
  background: #baff29;
  content: "";
  transform: rotate(5deg);
}

.geo-landing-dark-copy p {
  max-width: 470px;
  margin: 20px 0 0;
  color: rgb(255 255 255 / 72%);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-landing-dark-copy span {
  display: inline-block;
  margin-top: 20px;
  color: #6d28ff;
  font-family: "Comic Sans MS", "Bradley Hand", "Marker Felt", cursive;
  font-size: 22px;
  font-weight: 850;
  transform: rotate(-5deg);
}

.geo-landing-dark-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.geo-landing-dark-cards article {
  position: relative;
  min-height: 170px;
  padding: 22px 22px 18px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  background: linear-gradient(180deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 5%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 10%);
}

.geo-landing-dark-cards span,
.geo-landing-dark-cards small {
  color: rgb(255 255 255 / 74%);
  font-size: 13px;
  font-weight: 800;
}

.geo-landing-dark-cards strong {
  display: block;
  margin-top: 28px;
  color: #ffffff;
  font-size: 40px;
  font-weight: 950;
  line-height: 1;
}

.geo-landing-dark-cards article:nth-child(2) strong {
  color: #baff29;
}

.geo-landing-dark-cards article:nth-child(3) strong {
  color: #d7c8ff;
}

.geo-landing-dark-cards i {
  position: absolute;
  right: 20px;
  bottom: 22px;
  left: 72px;
  height: 28px;
  border-bottom: 2px solid #6d28ff;
  border-radius: 50%;
}

.geo-landing-dark-cards article:nth-child(2) i {
  border-bottom-color: #baff29;
}

.geo-landing-dark-cards article:nth-child(3) i {
  border-bottom-color: #9b7cff;
}

.geo-landing-dark-button {
  min-width: 148px;
  min-height: 52px;
  border-radius: 999px;
  background: #baff29;
  color: #111019;
  font-weight: 950;
}

.geo-landing-boundary {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e0ef;
  border-left: 5px solid #baff29;
  border-radius: 10px;
  background: #ffffff;
  color: #5f5868;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

@media (max-width: 1180px) {
  .geo-landing-shell {
    padding: 30px;
  }

  .geo-landing-hero,
  .geo-landing-workflow,
  .geo-landing-dark-cta {
    grid-template-columns: 1fr;
  }

  .geo-landing-hero {
    min-height: auto;
  }

  .geo-landing-collage {
    min-height: 430px;
  }

  .geo-landing-feature-strip,
  .geo-landing-workflow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-landing-feature-strip article {
    border-bottom: 1px solid #e4e0ea;
  }

  .geo-landing-workflow-steps article::after {
    display: none;
  }
}

@media (max-width: 820px) {
  .geo-landing-page {
    padding: 12px 0 24px;
  }

  .geo-landing-shell {
    width: min(100% - 24px, 1680px);
    padding: 20px;
  }

  .geo-landing-nav {
    grid-template-columns: 1fr;
  }

  .geo-landing-nav-links,
  .geo-landing-nav-actions {
    justify-content: flex-start;
    gap: 14px;
  }

  .geo-landing-hero {
    padding-top: 36px;
  }

  .geo-landing-hero h1 {
    font-size: 54px;
    white-space: normal;
  }

  .geo-landing-hero h2 {
    font-size: 30px;
  }

  .geo-landing-collage {
    min-height: 370px;
    transform: scale(0.86);
    transform-origin: top left;
  }

  .geo-landing-feature-strip,
  .geo-landing-workflow-steps,
  .geo-landing-dark-cards {
    grid-template-columns: 1fr;
  }

  .geo-landing-dark-cta {
    margin-right: 0;
    margin-left: 0;
    padding: 28px;
  }
}
</style>

<script setup lang="ts">
type HomeCapability = {
  title: string;
  description: string;
};

type HomeWorkflowStep = {
  title: string;
  shortName: string;
};

const capabilities: HomeCapability[] = [
  {
    title: "用户问法",
    description: "沉淀真实用户会向 AI 提出的采购、选型、对比和场景问题。"
  },
  {
    title: "产品证据",
    description: "整理产品参数、场景资料、案例和 FAQ，作为 AI 可引用的事实底座。"
  },
  {
    title: "发布文章",
    description: "围绕缺口生成引用友好的内容草稿，发布前保留人工复核。"
  },
  {
    title: "AI 推荐记录",
    description: "记录模型是否提及、推荐、引用官网，以及没有推荐的原因。"
  }
];

const workflowSteps: HomeWorkflowStep[] = [
  { title: "问法", shortName: "Prompt" },
  { title: "证据", shortName: "Evidence" },
  { title: "内容", shortName: "Content" },
  { title: "推荐记录", shortName: "Model" },
  { title: "复盘", shortName: "Review" }
];
</script>

<template>
  <main class="home-entry-page">
    <nav class="home-entry-nav" aria-label="GEO 工作站首页导航">
      <RouterLink class="home-entry-brand" to="/">
        <span class="home-entry-brand-mark" aria-hidden="true">G</span>
        <span>GEO 工作站</span>
      </RouterLink>
      <RouterLink class="home-entry-login" to="/login">登录</RouterLink>
    </nav>

    <section class="home-entry-hero">
      <div class="home-entry-hero-copy">
        <p class="home-entry-eyebrow">AI visibility operations</p>
        <h1>AI 可见度与 GEO 运营工作站</h1>
        <p>
          用一套清楚的运营闭环判断品牌有没有被 AI 推荐，以及下一步该补问法、
          补产品证据、生成发布文章，还是复盘模型覆盖。
        </p>
        <div class="home-entry-actions">
          <RouterLink class="btn-primary home-entry-primary" to="/login">进入工作台</RouterLink>
          <a class="btn-secondary home-entry-secondary" href="#workflow">查看工作流</a>
        </div>
      </div>

      <aside class="home-entry-status-panel" aria-label="GEO 工作站能力摘要">
        <div class="home-entry-status-head">
          <span>当前关注</span>
          <strong>从 AI 推荐结果倒推运营动作</strong>
        </div>
        <dl class="home-entry-status-list">
          <div>
            <dt>品牌推荐</dt>
            <dd>模型是否明确推荐我方品牌</dd>
          </div>
          <div>
            <dt>官网引用</dt>
            <dd>回答是否引用官网、文章或知识库证据</dd>
          </div>
          <div>
            <dt>竞品占位</dt>
            <dd>竞品是否替代我方出现在推荐位置</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section id="capabilities" class="home-entry-section">
      <div class="home-entry-section-head">
        <span>核心能力</span>
        <h2>主流程只保留 4 个入口</h2>
      </div>
      <div class="home-entry-capability-grid">
        <article v-for="capability in capabilities" :key="capability.title">
          <h3>{{ capability.title }}</h3>
          <p>{{ capability.description }}</p>
        </article>
      </div>
    </section>

    <section id="workflow" class="home-entry-section">
      <div class="home-entry-section-head">
        <span>工作流</span>
        <h2>问法 → 证据 → 内容 → AI 推荐记录 → 复盘</h2>
      </div>
      <ol class="home-entry-workflow" aria-label="GEO 运营工作流">
        <li v-for="(step, index) in workflowSteps" :key="step.title">
          <span>{{ String(index + 1).padStart(2, "0") }}</span>
          <strong>{{ step.title }}</strong>
          <em>{{ step.shortName }}</em>
        </li>
      </ol>
    </section>

    <footer class="home-entry-footer">
      <span>内部 MVP · 本地 smoke 数据不代表正式线上结果</span>
      <RouterLink to="/help">查看使用教程</RouterLink>
    </footer>
  </main>
</template>

<style scoped>
.home-entry-page {
  min-height: 100vh;
  padding: 24px clamp(18px, 4vw, 56px) 40px;
  background:
    linear-gradient(#e5e7eb 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, #e5e7eb 1px, transparent 1px) 0 0 / 32px 32px,
    radial-gradient(circle at 72% 18%, rgb(0 112 243 / 8%), transparent 34%),
    var(--bg-app);
  color: var(--text-primary);
}

.home-entry-nav,
.home-entry-hero,
.home-entry-section,
.home-entry-footer {
  width: min(100%, 1180px);
  margin-inline: auto;
}

.home-entry-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
}

.home-entry-brand,
.home-entry-login,
.home-entry-actions a,
.home-entry-footer a {
  color: inherit;
  text-decoration: none;
}

.home-entry-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.home-entry-brand-mark {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 800;
}

.home-entry-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-regular);
  font-size: 13px;
  font-weight: 600;
}

.home-entry-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 32px;
  align-items: stretch;
  padding: 80px 0 42px;
}

.home-entry-hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
}

.home-entry-eyebrow,
.home-entry-section-head span {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.home-entry-hero h1 {
  max-width: 720px;
  margin: 14px 0 0;
  color: var(--text-primary);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.04;
  text-wrap: balance;
}

.home-entry-hero-copy > p:not(.home-entry-eyebrow) {
  max-width: 680px;
  margin: 18px 0 0;
  color: var(--text-regular);
  font-size: 16px;
  line-height: 1.8;
}

.home-entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.home-entry-primary,
.home-entry-secondary {
  min-height: 36px;
}

.home-entry-status-panel,
.home-entry-capability-grid article {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-none);
}

.home-entry-status-panel {
  display: grid;
  gap: 18px;
  align-self: center;
  padding: 20px;
}

.home-entry-status-head {
  display: grid;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.home-entry-status-head span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.home-entry-status-head strong {
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1.4;
}

.home-entry-status-list {
  display: grid;
  gap: 0;
  margin: 0;
}

.home-entry-status-list div {
  display: grid;
  gap: 4px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-light);
}

.home-entry-status-list div:last-child {
  border-bottom: 0;
}

.home-entry-status-list dt {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.home-entry-status-list dd {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.home-entry-section {
  padding: 34px 0 0;
}

.home-entry-section-head {
  display: grid;
  gap: 8px;
  max-width: 760px;
}

.home-entry-section-head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 720;
  letter-spacing: 0;
  line-height: 1.25;
}

.home-entry-capability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.home-entry-capability-grid article {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 142px;
  padding: 16px;
}

.home-entry-capability-grid article::before {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--brand-primary);
  content: "";
}

.home-entry-capability-grid h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
}

.home-entry-capability-grid p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.home-entry-workflow {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  margin: 18px 0 0;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  list-style: none;
  overflow: hidden;
}

.home-entry-workflow li {
  display: grid;
  gap: 5px;
  min-height: 102px;
  padding: 15px;
  border-right: 1px solid var(--border-light);
}

.home-entry-workflow li:last-child {
  border-right: 0;
}

.home-entry-workflow span,
.home-entry-workflow em {
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
}

.home-entry-workflow strong {
  color: var(--text-primary);
  font-size: 15px;
}

.home-entry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 46px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 12px;
}

.home-entry-footer a {
  color: var(--text-regular);
  font-weight: 600;
}

@media (max-width: 980px) {
  .home-entry-hero {
    grid-template-columns: 1fr;
    padding-top: 54px;
  }

  .home-entry-capability-grid,
  .home-entry-workflow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-entry-workflow li {
    border-right: 0;
    border-bottom: 1px solid var(--border-light);
  }
}

@media (max-width: 640px) {
  .home-entry-page {
    padding-inline: 14px;
  }

  .home-entry-hero h1 {
    font-size: 38px;
  }

  .home-entry-capability-grid,
  .home-entry-workflow {
    grid-template-columns: 1fr;
  }

  .home-entry-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

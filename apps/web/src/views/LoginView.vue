<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Lock, Message } from "@element-plus/icons-vue";
import { ApiClientError } from "@/api/http";
import { useAuthStore } from "@/stores/auth";

type LoginPreviewCard = {
  label: string;
  value: string;
  tone: "blue" | "green" | "orange" | "cyan";
};

type LoginWorkflowStep = {
  label: string;
  value: string;
};

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  email: "",
  password: ""
});
const errorMessage = ref("");

// 登录页静态产品预览不接 API，也不代表真实业务数据。
const previewCards: LoginPreviewCard[] = [
  { label: "今日待处理", value: "18", tone: "orange" },
  { label: "可发布文章", value: "6", tone: "green" },
  { label: "需补证据", value: "12", tone: "blue" },
  { label: "覆盖异常", value: "4", tone: "cyan" }
];

const workflowSteps: LoginWorkflowStep[] = [
  { label: "问法资产", value: "追踪" },
  { label: "知识库", value: "补证" },
  { label: "内容生成", value: "检查" },
  { label: "模型覆盖", value: "复盘" }
];

const previewSignals = ["官网引用", "参数待核对", "文章可优化"];

const submitLogin = async () => {
  errorMessage.value = "";

  if (!form.email.trim() || !form.password) {
    errorMessage.value = "请输入邮箱和密码";
    return;
  }

  try {
    await authStore.login({
      email: form.email.trim(),
      password: form.password
    });
    ElMessage.success("登录成功");
    await router.replace("/dashboard");
  } catch (error) {
    errorMessage.value =
      error instanceof ApiClientError ? error.message : "登录失败，请稍后重试或联系管理员";
  }
};
</script>

<template>
  <main class="login-page geo-login-page">
    <section class="geo-login-shell">
      <RouterLink class="geo-login-brand" to="/">
        <span class="geo-login-brand-mark" aria-hidden="true">G</span>
        <span>GEO 工作站</span>
      </RouterLink>

      <section class="geo-login-mobile-intro" aria-label="登录页简介">
        <h1>进入 GEO 运营驾驶舱</h1>
        <p>统一管理问法资产、证据库与模型覆盖复盘。</p>
      </section>

      <div class="geo-login-layout">
        <aside class="geo-login-context" aria-label="GEO 工作站定位">
          <p class="geo-login-eyebrow">GEO 运营系统</p>
          <h1>进入 GEO 运营驾驶舱</h1>
          <p>统一管理问法资产、证据库与模型覆盖复盘。</p>
          <section class="geo-login-preview-board" aria-label="GEO 工作站产品预览">
            <div class="geo-login-preview-top">
              <span>运营概览</span>
              <strong>内部版</strong>
            </div>
            <div class="geo-login-preview-cards">
              <article
                v-for="card in previewCards"
                :key="card.label"
                :class="`geo-login-preview-card--${card.tone}`"
              >
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
              </article>
            </div>
            <div class="geo-login-preview-flow" aria-label="GEO 闭环流程预览">
              <span v-for="step in workflowSteps" :key="step.label">
                <strong>{{ step.label }}</strong>
                <em>{{ step.value }}</em>
              </span>
            </div>
            <div class="geo-login-preview-evidence">
              <span v-for="signal in previewSignals" :key="signal">
                <i class="status-dot status-dot--success" />
                {{ signal }}
              </span>
            </div>
          </section>
        </aside>

        <section class="login-panel geo-login-card" aria-label="登录工作站">
          <div class="geo-login-card-head">
            <h2>账户登录</h2>
            <span>使用内部账号进入 GEO 工作站。</span>
          </div>

          <el-alert
            v-if="errorMessage"
            class="login-alert geo-login-alert"
            type="error"
            :title="errorMessage"
            show-icon
            :closable="false"
          />

          <el-form class="login-form geo-login-form" label-position="top" @submit.prevent="submitLogin">
            <el-form-item label="用户 / 邮箱">
              <el-input
                v-model="form.email"
                :prefix-icon="Message"
                autocomplete="username"
                placeholder="admin@example.com"
              />
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="form.password"
                :prefix-icon="Lock"
                autocomplete="current-password"
                placeholder="请输入密码"
                show-password
                type="password"
                @keyup.enter="submitLogin"
              />
            </el-form-item>

            <el-button
              class="login-submit geo-login-submit"
              type="primary"
              :loading="authStore.loading"
              @click="submitLogin"
            >
              登录
            </el-button>
          </el-form>

          <p class="login-note geo-login-note">
            当前为企业内部系统，暂不开放注册。
          </p>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.geo-login-page {
  min-height: 100vh;
  padding: clamp(20px, 4vw, 50px);
  background:
    radial-gradient(circle at 18% 18%, rgb(37 99 235 / 4%), transparent 31%),
    radial-gradient(circle at 78% 72%, rgb(14 165 233 / 3%), transparent 30%),
    linear-gradient(rgb(226 232 240 / 32%) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(90deg, rgb(226 232 240 / 32%) 1px, transparent 1px) 0 0 / 34px 34px,
    var(--bg-app);
  color: var(--text-primary);
}

.geo-login-shell {
  display: grid;
  gap: clamp(24px, 4vw, 46px);
  width: min(100%, 1180px);
  margin: 0 auto;
}

@media (min-width: 960px) {
  .geo-login-brand {
    margin-left: -38px;
  }
}

.geo-login-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
}

.geo-login-brand-mark {
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

.geo-login-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(360px, 2fr);
  gap: clamp(34px, 6vw, 74px);
  align-items: center;
  min-height: calc(100vh - 126px);
}

.geo-login-context,
.geo-login-mobile-intro {
  display: grid;
  min-width: 0;
}

.geo-login-context {
  gap: 20px;
}

.geo-login-mobile-intro {
  display: none;
  gap: 8px;
}

.geo-login-eyebrow {
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 650;
}

.geo-login-context h1,
.geo-login-mobile-intro h1 {
  max-width: 680px;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(36px, 4vw, 54px);
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.08;
  text-wrap: balance;
}

.geo-login-context > p,
.geo-login-mobile-intro p {
  max-width: 600px;
  margin: 0;
  color: var(--text-regular);
  font-size: 15px;
  line-height: 1.75;
}

.geo-login-preview-board {
  display: grid;
  gap: 14px;
  max-width: 680px;
  padding: 18px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-surface);
  box-shadow: 0 22px 56px rgb(15 23 42 / 8%);
}

.geo-login-preview-top,
.geo-login-preview-flow,
.geo-login-preview-evidence {
  display: flex;
  align-items: center;
}

.geo-login-preview-top {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.geo-login-preview-top span,
.geo-login-preview-top strong,
.geo-login-preview-cards span,
.geo-login-preview-flow em,
.geo-login-preview-evidence span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.geo-login-preview-top strong {
  color: var(--brand-primary);
}

.geo-login-preview-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.geo-login-preview-cards article {
  display: grid;
  gap: 8px;
  min-height: 72px;
  padding: 11px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-md);
  background: #f8fafc;
}

.geo-login-preview-cards strong {
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 820;
  line-height: 1;
}

.geo-login-preview-card--blue {
  border-left: 3px solid #2563eb;
}

.geo-login-preview-card--green {
  border-left: 3px solid #16a34a;
}

.geo-login-preview-card--orange {
  border-left: 3px solid #d97706;
}

.geo-login-preview-card--cyan {
  border-left: 3px solid #0891b2;
}

.geo-login-preview-flow {
  gap: 8px;
}

.geo-login-preview-flow span {
  display: grid;
  min-width: 0;
  flex: 1 1 0;
  gap: 4px;
  padding: 9px;
  border: 1px solid #dbeafe;
  border-radius: var(--radius-md);
  background: #f8fbff;
}

.geo-login-preview-flow strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.geo-login-preview-flow em {
  font-style: normal;
}

.geo-login-preview-evidence {
  flex-wrap: wrap;
  gap: 8px;
}

.geo-login-preview-evidence span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.geo-login-card {
  display: grid;
  gap: 20px;
  width: 100%;
  padding: 28px;
  border: 1px solid var(--border-light);
  border-radius: 9px;
  background: var(--bg-surface);
  box-shadow: 0 18px 44px rgb(15 23 42 / 8%);
}

.geo-login-card-head {
  display: grid;
  gap: 7px;
}

.geo-login-card-head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 720;
  line-height: 1.25;
}

.geo-login-card-head span {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.geo-login-alert {
  margin: 0;
}

.geo-login-form {
  display: grid;
  gap: 12px;
}

.geo-login-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.geo-login-form :deep(.el-form-item__label) {
  color: var(--text-regular);
  font-size: 13px;
  font-weight: 650;
}

.geo-login-form :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 0 0 1px #e5e7eb inset;
}

.geo-login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #2563eb inset,
    0 0 0 2px rgb(37 99 235 / 10%);
}

.geo-login-submit {
  width: 100%;
  min-height: 42px;
  margin-top: 2px;
  border-radius: 6px;
  font-weight: 650;
}

.geo-login-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.65;
}

@media (max-width: 860px) {
  .geo-login-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .geo-login-card {
    max-width: 440px;
  }

  .geo-login-context {
    display: none;
  }

  .geo-login-mobile-intro {
    display: grid;
  }

  .geo-login-preview-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .geo-login-page {
    padding: 18px 14px;
    background:
      radial-gradient(circle at 26% 14%, rgb(37 99 235 / 3%), transparent 34%),
      linear-gradient(rgb(226 232 240 / 24%) 1px, transparent 1px) 0 0 / 32px 32px,
      linear-gradient(90deg, rgb(226 232 240 / 24%) 1px, transparent 1px) 0 0 / 32px 32px,
      var(--bg-app);
  }

  .geo-login-shell {
    gap: 22px;
  }

  .geo-login-mobile-intro h1 {
    font-size: 31px;
  }

  .geo-login-card {
    max-width: none;
    padding: 18px;
  }

  .geo-login-preview-cards,
  .geo-login-preview-flow {
    grid-template-columns: 1fr;
  }

  .geo-login-preview-flow {
    display: grid;
  }
}
</style>

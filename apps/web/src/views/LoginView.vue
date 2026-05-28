<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Lock, Message } from "@element-plus/icons-vue";
import { ApiClientError } from "@/api/http";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();

const form = reactive({
  email: "",
  password: ""
});
const errorMessage = ref("");

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
      error instanceof ApiClientError ? error.message : "登录失败，请确认 API 服务是否可用";
  }
};
</script>

<template>
  <main class="login-page geo-login-page">
    <section class="geo-login-shell">
      <RouterLink class="geo-login-brand" to="/">
        <span class="geo-login-logo-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        GEO 工作站
      </RouterLink>

      <div class="geo-login-panel">
        <section class="login-panel geo-login-card" aria-label="登录工作站">
          <p class="geo-login-kicker">登录 GEO 工作站</p>
          <h1>欢迎回来</h1>
          <p class="login-copy geo-login-card-copy">
            登录 GEO 工作站，继续处理诊断、知识库、内容生成和模型覆盖复盘。
          </p>

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

            <div class="geo-login-row">
              <label class="geo-login-checkbox">
                <input type="checkbox">
                记住我
              </label>
              <button class="geo-login-forgot" type="button">忘记密码？</button>
            </div>

            <el-button
              class="login-submit geo-login-submit"
              type="primary"
              :loading="authStore.loading"
              @click="submitLogin"
            >
              登录
            </el-button>
          </el-form>

          <div class="geo-login-status">
            <span><i aria-hidden="true" />{{ appStore.environmentLabel }}</span>
            <span><i aria-hidden="true" />API 状态：{{ appStore.isProduction ? "正式 API" : "待确认" }}</span>
          </div>

          <p class="login-note geo-login-note">
            当前为内部 MVP，暂不开放注册、找回密码、OAuth 或多租户能力。
          </p>
        </section>

        <aside class="geo-login-side" aria-label="GEO 工作站能力说明">
          <div class="geo-login-side-card">
            <p class="geo-login-kicker">GEO 工作站</p>
            <h2>登录后继续处理 GEO 运营闭环</h2>
            <p class="geo-login-side-copy">
              从诊断、知识库、发布文章到模型覆盖记录，保持日常运营可追踪、可复盘。
            </p>

            <ul class="geo-login-feature-list">
              <li>GEO 诊断</li>
              <li>企业知识库</li>
              <li>发布文章工作台</li>
              <li>模型覆盖记录</li>
            </ul>

            <div class="geo-login-mini-status">
              <span>今日进入后优先查看</span>
              <strong>待处理事项与模型覆盖记录</strong>
            </div>

            <div class="geo-login-boundary-tags" aria-label="使用边界">
              <span>内部使用</span>
              <span>人工确认</span>
              <span>数据边界清晰</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>

<style scoped>
.geo-login-page {
  display: flex;
  min-height: 100dvh;
  overflow-x: hidden;
  padding: clamp(24px, 5vw, 56px);
  background:
    radial-gradient(circle at 12% 12%, rgb(37 99 235 / 10%), transparent 30%),
    radial-gradient(circle at 90% 18%, rgb(8 145 178 / 8%), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef4fb 56%, #f8fafc 100%);
  color: #0f172a;
  align-items: center;
  justify-content: center;
}

.geo-login-shell {
  display: grid;
  gap: clamp(24px, 4vw, 36px);
  width: min(100%, 1120px);
}

.geo-login-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  color: #0f172a;
  font-size: 14px;
  font-weight: 850;
  text-decoration: none;
}

.geo-login-logo-mark {
  display: grid;
  grid-template-columns: repeat(2, 9px);
  grid-template-rows: repeat(2, 9px);
  gap: 4px;
}

.geo-login-logo-mark i {
  border-radius: 50%;
  background: #2563eb;
}

.geo-login-logo-mark i:nth-child(4) {
  background: #ffffff;
  box-shadow: inset 0 0 0 2px #2563eb;
}

.geo-login-panel {
  display: grid;
  grid-template-columns: minmax(460px, 520px) minmax(320px, 420px);
  gap: clamp(32px, 5vw, 64px);
  align-items: center;
  justify-content: center;
}

.geo-login-kicker {
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

.geo-login-card {
  display: grid;
  gap: 18px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: clamp(34px, 4vw, 48px);
  border: 1px solid #dbe6f2;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 24px 64px rgb(15 23 42 / 12%);
}

.geo-login-card .geo-login-kicker {
  color: #2563eb;
}

.geo-login-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(32px, 3.4vw, 38px);
  font-weight: 950;
  line-height: 1.16;
}

.geo-login-card-copy {
  max-width: 430px;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-login-alert {
  margin: 0;
}

.geo-login-form {
  display: grid;
  gap: 10px;
  margin-top: 2px;
}

.geo-login-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.geo-login-form :deep(.el-form-item__label) {
  color: #334155;
  font-weight: 850;
}

.geo-login-form :deep(.el-input__wrapper) {
  min-height: 52px;
  border-radius: 12px;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #dbe6f2 inset;
}

.geo-login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #2563eb inset,
    0 0 0 4px rgb(37 99 235 / 10%);
}

.geo-login-row,
.geo-login-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.geo-login-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.geo-login-checkbox input {
  width: 14px;
  height: 14px;
  accent-color: #2563eb;
}

.geo-login-forgot {
  border: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: default;
}

.geo-login-submit {
  width: 100%;
  height: 54px;
  margin-top: 6px;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
  box-shadow: 0 16px 28px rgb(37 99 235 / 22%);
}

.geo-login-submit:hover {
  background: #1d4ed8;
}

.geo-login-submit:deep(.el-icon) {
  color: #ffffff;
}

.geo-login-status {
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.geo-login-status span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.geo-login-status i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.geo-login-note {
  margin-top: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.65;
}

.geo-login-side {
  width: 100%;
  max-width: 420px;
  justify-self: start;
}

.geo-login-side-card {
  display: grid;
  gap: 18px;
  padding: clamp(22px, 3vw, 30px);
  border: 1px solid #dbe6f2;
  border-radius: 18px;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 18px 48px rgb(15 23 42 / 8%);
  backdrop-filter: blur(14px);
}

.geo-login-side h2 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(24px, 2.4vw, 30px);
  font-weight: 950;
  line-height: 1.22;
}

.geo-login-side-copy {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.75;
}

.geo-login-feature-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.geo-login-feature-list li {
  position: relative;
  padding-left: 22px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
}

.geo-login-feature-list li::before {
  position: absolute;
  top: 8px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0891b2;
  content: "";
}

.geo-login-mini-status {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #0f172a;
  color: #ffffff;
}

.geo-login-mini-status span {
  color: #93c5fd;
  font-size: 12px;
  font-weight: 850;
}

.geo-login-mini-status strong {
  color: #ffffff;
  font-size: 14px;
  line-height: 1.5;
}

.geo-login-boundary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.geo-login-boundary-tags span {
  padding: 7px 10px;
  border: 1px solid #dbe6f2;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .geo-login-panel {
    grid-template-columns: minmax(440px, 520px) minmax(300px, 380px);
    gap: clamp(28px, 4vw, 40px);
  }

  .geo-login-side {
    max-width: 380px;
  }
}

@media (max-width: 960px) {
  .geo-login-page {
    align-items: flex-start;
  }

  .geo-login-panel {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .geo-login-card {
    order: 1;
    max-width: 520px;
  }

  .geo-login-side {
    order: 2;
    max-width: 520px;
    justify-self: center;
  }
}

@media (max-width: 640px) {
  .geo-login-page {
    padding: 18px 12px;
  }

  .geo-login-shell {
    gap: 18px;
  }

  .geo-login-card,
  .geo-login-side-card {
    padding: 24px 20px;
    border-radius: 16px;
  }

  .geo-login-card h1 {
    font-size: 30px;
  }

  .geo-login-status {
    align-items: flex-start;
    flex-direction: column;
  }

  .geo-login-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

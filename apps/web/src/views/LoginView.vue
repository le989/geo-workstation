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
      <RouterLink class="geo-login-home" to="/">
        <span class="geo-login-logo-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        返回 GEO 工作站首页
      </RouterLink>

      <div class="geo-login-copy">
        <div class="geo-login-grid" aria-hidden="true" />
        <div class="geo-login-orb" aria-hidden="true" />
        <div class="geo-login-slab" aria-hidden="true" />
        <div class="geo-login-brush" aria-hidden="true" />

        <p class="geo-login-kicker">内部访问控制</p>
        <h1>GEO 工作站</h1>
        <h2>AI 搜索可见度运营闭环</h2>
        <p class="geo-login-lede">
          从未命中词发现、知识库补齐、内容生成到多模型复测，让 GEO 运营变成可执行、可追踪、可复盘的工作流。
        </p>

        <ul>
          <li>发现未命中机会</li>
          <li>补齐知识库和内容</li>
          <li>多模型复测验证结果</li>
          <li>报表复盘持续优化</li>
        </ul>

        <article class="geo-login-signal">
          <span>Visibility Loop</span>
          <strong>诊断 → 生成 → 复测</strong>
        </article>
      </div>

      <section class="login-panel geo-login-card" aria-label="登录工作站">
        <p class="geo-login-kicker">Workspace Sign In</p>
        <h2>登录工作站</h2>
        <p class="login-copy geo-login-card-copy">
          进入 GEO 运营闭环，继续处理诊断、内容和复测任务。
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
    </section>
  </main>
</template>

<style scoped>
.geo-login-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  padding: clamp(18px, 3vw, 40px);
  background:
    radial-gradient(circle at 82% 14%, rgb(109 40 255 / 8%), transparent 25%),
    linear-gradient(90deg, rgb(17 16 25 / 2%) 1px, transparent 1px) 0 0 / 58px 58px,
    linear-gradient(0deg, rgb(17 16 25 / 1.4%) 1px, transparent 1px) 0 0 / 58px 58px,
    #ffffff;
  place-items: center;
}

.geo-login-shell {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(390px, 0.92fr);
  gap: 30px;
  align-items: center;
  width: min(1220px, 100%);
  padding: clamp(22px, 3vw, 44px);
  border: 1px solid #e5e0ef;
  border-radius: 24px;
  background:
    radial-gradient(circle at 86% 18%, rgb(109 40 255 / 8%), transparent 24%),
    #ffffff;
  box-shadow: 0 28px 90px rgb(24 20 36 / 10%);
}

.geo-login-home {
  position: absolute;
  top: 22px;
  left: 28px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: rgb(255 255 255 / 76%);
  font-size: 13px;
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
  background: #6d28ff;
}

.geo-login-logo-mark i:nth-child(4) {
  background: #ffffff;
  box-shadow: inset 0 0 0 2px #6d28ff;
}

.geo-login-copy {
  position: relative;
  display: grid;
  align-content: center;
  overflow: hidden;
  min-height: 620px;
  padding: clamp(44px, 5vw, 70px) clamp(30px, 4.5vw, 58px);
  border-radius: 22px;
  background:
    radial-gradient(circle at 18% 105%, rgb(109 40 255 / 68%), transparent 23%),
    radial-gradient(circle at 78% 12%, rgb(109 40 255 / 42%), transparent 28%),
    linear-gradient(135deg, #08070b 0%, #16111f 58%, #08070b 100%);
  color: #ffffff;
  isolation: isolate;
}

.geo-login-copy::after {
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

.geo-login-copy > :not(.geo-login-grid):not(.geo-login-orb):not(.geo-login-slab):not(.geo-login-brush) {
  position: relative;
  z-index: 2;
}

.geo-login-kicker {
  margin: 0;
  color: #baff29;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

.geo-login-copy h1 {
  margin: 10px 0 0;
  color: #ffffff;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: clamp(56px, 5vw, 84px);
  font-weight: 950;
  line-height: 0.96;
}

.geo-login-copy h2 {
  margin: 8px 0 0;
  color: #ffffff;
  font-size: clamp(26px, 2.4vw, 38px);
  font-weight: 950;
  line-height: 1.18;
}

.geo-login-lede {
  max-width: 620px;
  margin: 22px 0 0;
  color: rgb(255 255 255 / 70%);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.8;
}

.geo-login-copy ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 640px;
  margin: 30px 0 0;
  padding: 0;
  list-style: none;
}

.geo-login-copy li {
  position: relative;
  padding: 14px 15px 14px 35px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 12px;
  background: rgb(255 255 255 / 7%);
  color: #ffffff;
  font-weight: 750;
}

.geo-login-copy li::before {
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

.geo-login-grid {
  position: absolute;
  right: 34px;
  bottom: 70px;
  width: 270px;
  height: 180px;
  background:
    radial-gradient(circle, rgb(255 255 255 / 24%) 1.5px, transparent 2.4px) 0 0 / 16px 16px;
  opacity: 0.26;
  z-index: -2;
}

.geo-login-orb {
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

.geo-login-slab {
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

.geo-login-brush {
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

.geo-login-signal {
  display: inline-grid;
  gap: 7px;
  width: fit-content;
  margin-top: 34px;
  padding: 14px 18px;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 999px;
  background: rgb(255 255 255 / 8%);
}

.geo-login-signal span {
  color: #baff29;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.geo-login-signal strong {
  color: #ffffff;
  font-size: 14px;
}

.geo-login-card {
  display: grid;
  gap: 16px;
  width: min(500px, 100%);
  margin: 0 auto;
  padding: clamp(28px, 3vw, 42px);
  border: 1px solid #e5e0ef;
  border-radius: 22px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 28px 80px rgb(24 20 36 / 12%);
}

.geo-login-card .geo-login-kicker {
  color: #6d28ff;
}

.geo-login-card h2 {
  margin: 0;
  color: #111019;
  font-size: 34px;
  font-weight: 950;
}

.geo-login-card-copy {
  max-width: 360px;
  color: #706879;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.7;
}

.geo-login-alert {
  margin: 0;
}

.geo-login-form {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}

.geo-login-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.geo-login-form :deep(.el-form-item__label) {
  color: #332d3d;
  font-weight: 850;
}

.geo-login-form :deep(.el-input__wrapper) {
  min-height: 46px;
  border-radius: 10px;
  background: #fbfaff;
  box-shadow: 0 0 0 1px #ded8eb inset;
}

.geo-login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #6d28ff inset,
    0 0 0 4px rgb(109 40 255 / 10%);
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
  color: #5f576b;
  font-size: 13px;
  font-weight: 750;
}

.geo-login-checkbox input {
  width: 14px;
  height: 14px;
  accent-color: #6d28ff;
}

.geo-login-forgot {
  border: 0;
  background: transparent;
  color: #6d28ff;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: default;
}

.geo-login-submit {
  width: 100%;
  height: 48px;
  margin-top: 4px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #4d19e8 0%, #7b3cff 100%);
  color: #ffffff;
  font-weight: 900;
  box-shadow: 0 18px 34px rgb(91 32 234 / 24%);
}

.geo-login-submit:deep(.el-icon) {
  color: #ffffff;
}

.geo-login-status {
  padding-top: 14px;
  border-top: 1px solid #eee9f5;
  color: #716a7e;
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
  background: #baff29;
  box-shadow: 0 0 14px rgb(186 255 41 / 62%);
}

.geo-login-note {
  margin-top: 0;
  color: #8a8494;
  font-size: 12px;
  line-height: 1.65;
}

@media (max-width: 980px) {
  .geo-login-shell {
    grid-template-columns: 1fr;
  }

  .geo-login-home {
    color: rgb(255 255 255 / 82%);
  }

  .geo-login-copy {
    min-height: 520px;
  }
}

@media (max-width: 640px) {
  .geo-login-page {
    padding: 12px;
  }

  .geo-login-shell {
    padding: 14px;
    border-radius: 18px;
  }

  .geo-login-home {
    position: relative;
    top: auto;
    left: auto;
    color: #111019;
  }

  .geo-login-copy {
    min-height: auto;
    padding: 48px 24px 30px;
  }

  .geo-login-copy h1 {
    font-size: 44px;
  }

  .geo-login-copy h2 {
    font-size: 26px;
  }

  .geo-login-copy ul,
  .geo-login-status {
    grid-template-columns: 1fr;
  }

  .geo-login-status {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

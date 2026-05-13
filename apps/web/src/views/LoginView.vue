<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Lock, Message } from "@element-plus/icons-vue";
import { ApiClientError } from "@/api/http";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
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
  <main class="login-page">
    <section class="login-panel">
      <div class="login-brand">
        <span class="login-brand-mark">GEO</span>
        <div>
          <p>内部访问控制</p>
          <h1>GEO 营销运营系统</h1>
        </div>
      </div>

      <p class="login-copy">
        面向生成式 AI 搜索/问答场景的内部营销运营工作台。请使用管理员分配的账号登录。
      </p>

      <el-alert
        v-if="errorMessage"
        class="login-alert"
        type="error"
        :title="errorMessage"
        show-icon
        :closable="false"
      />

      <el-form class="login-form" label-position="top" @submit.prevent="submitLogin">
        <el-form-item label="邮箱">
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
          class="login-submit"
          type="primary"
          :loading="authStore.loading"
          @click="submitLogin"
        >
          登录
        </el-button>
      </el-form>

      <p class="login-note">当前为内部 MVP，暂不开放注册、找回密码、OAuth 或多租户能力。</p>
    </section>
  </main>
</template>

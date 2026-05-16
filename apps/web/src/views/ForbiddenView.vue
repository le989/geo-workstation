<script setup lang="ts">
import { useRouter } from "vue-router";
import { Lock } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { getRoleLabel } from "@/utils/permission";

const router = useRouter();
const authStore = useAuthStore();
</script>

<template>
  <main class="forbidden-page">
    <section class="forbidden-panel">
      <el-icon class="forbidden-panel__icon">
        <Lock />
      </el-icon>
      <el-tag type="warning" effect="plain">无权访问</el-tag>
      <h1>当前账号无权访问该页面</h1>
      <p>
        当前身份为 {{ getRoleLabel(authStore.currentRole ?? authStore.currentUser?.role) }}。如需进入该模块，
        请联系平台管理员调整账号权限。
      </p>
      <div class="forbidden-panel__actions">
        <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
        <el-button @click="router.back()">返回上一页</el-button>
      </div>
    </section>
  </main>
</template>

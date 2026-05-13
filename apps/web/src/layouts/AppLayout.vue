<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Connection, SwitchButton } from "@element-plus/icons-vue";
import { navigationItems } from "@/config/navigation";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();

const activeMenu = computed(() => route.path);

const roleLabel = computed(() => {
  const role = authStore.currentUser?.role;
  const labels = {
    admin: "管理员",
    geo_operator: "GEO 运营",
    content_editor: "内容编辑",
    viewer: "查看者"
  };

  return role ? labels[role] : "未登录";
});

const handleLogout = async () => {
  await authStore.logout();
  window.location.assign("/login");
};
</script>

<template>
  <el-container class="admin-layout">
    <el-aside width="248px" class="admin-sidebar">
      <div class="brand-block">
        <span class="brand-mark">GEO</span>
        <div>
          <strong>营销运营系统</strong>
          <span>AI 搜索可见度闭环</span>
        </div>
      </div>

      <el-menu :default-active="activeMenu" router class="sidebar-menu">
        <el-menu-item v-for="item in navigationItems" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="admin-main">
      <el-header class="admin-header">
        <div>
          <p class="header-eyebrow">GEO Marketing Operations</p>
          <h2>GEO 营销运营系统</h2>
        </div>
        <div class="header-actions">
          <el-tag type="success" effect="plain">
            {{ appStore.environmentLabel }}
          </el-tag>
          <div v-if="authStore.currentUser" class="header-user">
            <strong>{{ authStore.currentUser.name }}</strong>
            <span>{{ authStore.currentUser.email }}</span>
            <el-tag size="small" effect="plain">{{ roleLabel }}</el-tag>
          </div>
          <el-tooltip :content="appStore.healthUrl" placement="bottom">
            <el-button :icon="Connection" plain> 后端健康状态 </el-button>
          </el-tooltip>
          <el-button :icon="SwitchButton" plain @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="admin-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

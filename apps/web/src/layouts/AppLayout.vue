<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Connection, SwitchButton } from "@element-plus/icons-vue";
import { navigationItems, type GeoPageMeta } from "@/config/navigation";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();

const activeMenu = computed(() => route.path);
const currentPage = computed(() => route.meta.geoPage as GeoPageMeta | undefined);

const navigationGroups = [
  {
    label: "GEO 运营闭环",
    items: navigationItems.filter((item) =>
      ["/dashboard", "/geo-analysis", "/geo-prompts", "/expansion"].includes(item.path)
    )
  },
  {
    label: "知识与内容资产",
    items: navigationItems.filter((item) =>
      ["/knowledge-bases", "/instruction-templates", "/content-tasks"].includes(item.path)
    )
  },
  {
    label: "复盘与配置",
    items: navigationItems.filter((item) =>
      ["/model-inclusion-records", "/reports", "/settings"].includes(item.path)
    )
  }
];

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
          <strong>GEO 工作站</strong>
          <span>AI 搜索可见度运营闭环</span>
        </div>
      </div>

      <el-menu :default-active="activeMenu" router class="sidebar-menu">
        <div v-for="group in navigationGroups" :key="group.label" class="sidebar-menu-group">
          <p class="sidebar-menu-group__label">{{ group.label }}</p>
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </div>
      </el-menu>
    </el-aside>

    <el-container class="admin-main">
      <el-header class="admin-header">
        <div class="header-title">
          <p class="header-eyebrow">内部 GEO 工作台</p>
          <h2>{{ currentPage?.title ?? "GEO 营销运营系统" }}</h2>
          <span>{{
            currentPage?.description ?? "围绕 GEO 闭环管理提示词、知识库、内容和效果记录。"
          }}</span>
        </div>
        <div class="header-actions">
          <el-tag class="header-env-tag" type="success" effect="plain">
            {{ appStore.environmentLabel }}
          </el-tag>
          <div v-if="authStore.currentUser" class="header-user">
            <div>
              <strong>{{ authStore.currentUser.name }}</strong>
              <span>{{ authStore.currentUser.email }}</span>
            </div>
            <el-tag size="small" effect="plain">{{ roleLabel }}</el-tag>
          </div>
          <el-tooltip :content="appStore.healthUrl" placement="bottom">
            <el-button :icon="Connection" plain>API 状态</el-button>
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

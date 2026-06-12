<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowDown,
  Connection,
  Expand,
  Fold,
  OfficeBuilding,
  SwitchButton
} from "@element-plus/icons-vue";
import { navigationItems } from "@/config/navigation";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { canAccessRoute, getRoleLabel } from "@/utils/permission";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "geo-workstation.sidebar-collapsed";

const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();
const storedSidebarCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
const defaultSidebarCollapsed =
  storedSidebarCollapsed === null
    ? window.matchMedia("(max-width: 1120px)").matches
    : storedSidebarCollapsed === "true";

const activeMenu = computed(() => {
  if (route.path === "/content-tasks") {
    return "/geo-content";
  }
  if (route.path === "/reports") {
    return "/geo-reports";
  }

  return route.path;
});
const isSidebarCollapsed = ref(defaultSidebarCollapsed);
const isNarrowLayout = ref(false);

let sidebarMediaQuery: MediaQueryList | undefined;

const updateNarrowLayout = () => {
  isNarrowLayout.value = sidebarMediaQuery?.matches ?? false;
};

onMounted(() => {
  sidebarMediaQuery = window.matchMedia("(max-width: 1120px)");
  updateNarrowLayout();
  sidebarMediaQuery.addEventListener("change", updateNarrowLayout);
});

onBeforeUnmount(() => {
  sidebarMediaQuery?.removeEventListener("change", updateNarrowLayout);
});

const isSidebarCollapseActive = computed(() => isSidebarCollapsed.value);

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed.value));
};

const getNavigationItemsByPath = (paths: string[]) =>
  paths
    .map((path) => navigationItems.find((item) => item.path === path))
    .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

const navigationGroups = [
  {
    label: "GEO 主流程",
    items: getNavigationItemsByPath([
      "/dashboard",
      "/geo-prompts",
      "/knowledge-bases",
      "/geo-content",
      "/model-inclusion-records"
    ])
  },
  {
    label: "复盘分析",
    items: getNavigationItemsByPath([
      "/evidence-citations",
      "/competitor-occupancy",
      "/geo-analysis",
      "/geo-reports"
    ])
  },
  {
    label: "辅助工具",
    items: getNavigationItemsByPath([
      "/expansion",
      "/aftersales-qa",
      "/instruction-templates",
      "/usage-analytics",
      "/operation-logs",
      "/users",
      "/departments",
      "/settings"
    ])
  },
  {
    label: "帮助与交接",
    items: getNavigationItemsByPath(["/help"])
  }
];

const visibleNavigationGroups = computed(() => {
  const role = authStore.currentRole ?? authStore.currentUser?.role;

  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessRoute(
          item.path,
          role,
          item.allowedRoles,
          authStore.currentCompany?.accessibleModules
        )
      )
    }))
    .filter((group) => group.items.length > 0);
});

const roleLabel = computed(() => {
  const role = authStore.currentRole ?? authStore.currentUser?.role;

  return role ? getRoleLabel(role) : "未登录";
});

const currentCompanyLabel = computed(() => authStore.currentCompany?.name ?? "未选择公司");
const userInitial = computed(() => authStore.currentUser?.name?.slice(0, 1) || "G");
const sidebarToggleLabel = computed(() =>
  isSidebarCollapseActive.value ? "展开菜单" : "收起菜单"
);

const handleLogout = async () => {
  await authStore.logout();
  window.location.assign("/login");
};

const handleUserCommand = (command: string | number | object) => {
  if (command === "logout") {
    void handleLogout();
  }
};

const handleCompanyCommand = (command: string | number | object) => {
  if (typeof command === "string") {
    authStore.setCurrentCompany(command);
  }
};
</script>

<template>
  <el-container
    class="admin-layout"
    :class="{
      'admin-layout--sidebar-collapsed': isSidebarCollapseActive,
      'admin-layout--narrow': isNarrowLayout
    }"
  >
    <el-aside :width="isSidebarCollapseActive ? '72px' : '248px'" class="admin-sidebar">
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <div>
          <strong>GEO 工作站</strong>
          <span>AI 搜索可见度运营闭环</span>
        </div>
      </div>

      <div class="sidebar-toggle-row">
        <el-tooltip :content="sidebarToggleLabel" placement="right" :show-after="250">
          <button
            class="sidebar-collapse-button"
            type="button"
            :aria-label="sidebarToggleLabel"
            :title="sidebarToggleLabel"
            @click="toggleSidebar"
          >
            <el-icon>
              <component :is="isSidebarCollapseActive ? Expand : Fold" />
            </el-icon>
            <span>{{ sidebarToggleLabel }}</span>
          </button>
        </el-tooltip>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isSidebarCollapseActive"
        :collapse-transition="false"
        router
        class="sidebar-menu"
      >
        <div v-for="group in visibleNavigationGroups" :key="group.label" class="sidebar-menu-group">
          <p class="sidebar-menu-group__label">{{ group.label }}</p>
          <el-menu-item
            v-for="item in group.items"
            :key="item.path"
            :index="item.path"
            :title="item.label"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </div>
      </el-menu>

      <div
        v-if="authStore.currentUser"
        class="sidebar-user-card"
        :title="`${authStore.currentUser.name} / ${currentCompanyLabel} / ${roleLabel}`"
      >
        <span class="sidebar-user-card__avatar">{{ userInitial }}</span>
        <div>
          <strong>{{ authStore.currentUser.name }}</strong>
          <span>{{ authStore.currentUser.email }}</span>
          <em>{{ roleLabel }}</em>
        </div>
      </div>
    </el-aside>

    <el-container class="admin-main">
      <el-header class="admin-header">
        <div class="header-actions">
          <el-tag class="header-env-tag" type="success" effect="plain">
            {{ appStore.environmentLabel }}
          </el-tag>
          <el-dropdown
            v-if="authStore.companies.length > 1"
            class="header-company-dropdown"
            trigger="click"
            @command="handleCompanyCommand"
          >
            <button class="header-company-trigger" type="button">
              <el-icon>
                <OfficeBuilding />
              </el-icon>
              <span>{{ currentCompanyLabel }}</span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="company in authStore.companies"
                  :key="company.id"
                  :command="company.id"
                  :disabled="company.id === authStore.currentCompany?.id"
                >
                  <span>{{ company.name }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-tag
            v-else-if="authStore.currentCompany"
            class="header-company-tag"
            effect="plain"
            type="info"
          >
            <el-icon>
              <OfficeBuilding />
            </el-icon>
            <span>{{ authStore.currentCompany.name }}</span>
          </el-tag>
          <el-tooltip :content="appStore.healthUrl" placement="bottom">
            <el-button class="header-status-button" :icon="Connection" plain>接口状态</el-button>
          </el-tooltip>
          <el-dropdown
            v-if="authStore.currentUser"
            class="header-user-dropdown"
            trigger="click"
            @command="handleUserCommand"
          >
            <button class="header-user-trigger" type="button">
              <span>{{ authStore.currentUser.name }}</span>
              <el-icon>
                <ArrowDown />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled class="header-user-menu__meta">
                  <div>
                    <strong>{{ authStore.currentUser.name }}</strong>
                    <span>{{ authStore.currentUser.email }}</span>
                    <em>角色：{{ roleLabel }}</em>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="admin-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

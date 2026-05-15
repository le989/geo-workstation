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

const SIDEBAR_COLLAPSED_STORAGE_KEY = "geo-workstation.sidebar-collapsed";

const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();

const activeMenu = computed(() => route.path);
const isSidebarCollapsed = ref(
  window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
);
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

const isSidebarCollapseActive = computed(() => isSidebarCollapsed.value && !isNarrowLayout.value);

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed.value));
};

const headerDisplayByPath: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "工作台",
    subtitle: "今日运营动作与待处理事项"
  },
  "/geo-analysis": {
    title: "GEO 诊断",
    subtitle: "前期品牌、官网与产品线诊断"
  },
  "/geo-prompts": {
    title: "提示词库",
    subtitle: "管理 GEO 词、场景词与追踪状态"
  },
  "/expansion": {
    title: "AI 拓词",
    subtitle: "从产品和场景扩展候选提示词"
  },
  "/knowledge-bases": {
    title: "知识库",
    subtitle: "管理产品资料、FAQ 和知识片段"
  },
  "/instruction-templates": {
    title: "指令模板",
    subtitle: "管理内容生成模板和规则"
  },
  "/content-tasks": {
    title: "内容生成",
    subtitle: "生成、审校、优化和发布稿"
  },
  "/model-inclusion-records": {
    title: "AI 收录记录",
    subtitle: "查看 AI 检测结果和命中状态"
  },
  "/reports": {
    title: "数据报表",
    subtitle: "查看覆盖、命中和优化建议"
  },
  "/settings": {
    title: "系统设置",
    subtitle: "管理项目档案和品牌上下文"
  },
  "/help": {
    title: "使用教程",
    subtitle: "查看 SOP、版本说明和操作指南"
  }
};

const headerDisplay = computed(
  () =>
    headerDisplayByPath[route.path] ?? {
      title: "GEO 工作站",
      subtitle: "AI 搜索可见度运营闭环"
    }
);

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
  },
  {
    label: "帮助与交接",
    items: navigationItems.filter((item) => ["/help"].includes(item.path))
  }
];

const roleLabel = computed(() => {
  const role = authStore.currentUser?.role;
  const labels = {
    platform_admin: "平台管理员",
    company_admin: "公司管理员",
    operator: "运营人员",
    admin: "管理员",
    geo_operator: "GEO 运营",
    content_editor: "内容编辑",
    viewer: "查看者"
  };

  return role ? labels[role] : "未登录";
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
    :class="{ 'admin-layout--sidebar-collapsed': isSidebarCollapseActive }"
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
        <div v-for="group in navigationGroups" :key="group.label" class="sidebar-menu-group">
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
        <div class="header-title">
          <h2>{{ headerDisplay.title }}</h2>
          <span>{{ headerDisplay.subtitle }}</span>
        </div>
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
            <el-button class="header-status-button" :icon="Connection" plain>API 状态</el-button>
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

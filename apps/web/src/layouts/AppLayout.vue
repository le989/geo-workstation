<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Connection } from "@element-plus/icons-vue";
import { navigationItems } from "@/config/navigation";
import { useAppStore } from "@/stores/app";

const route = useRoute();
const appStore = useAppStore();

const activeMenu = computed(() => route.path);
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
          <el-tooltip :content="appStore.healthUrl" placement="bottom">
            <el-button :icon="Connection" plain> 后端健康状态 </el-button>
          </el-tooltip>
        </div>
      </el-header>

      <el-main class="admin-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

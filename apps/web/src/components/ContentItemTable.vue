<script setup lang="ts">
import type { ContentItem, RelatedGeoPrompt } from "@/api/content";
import { computed } from "vue";
import { MoreFilled } from "@element-plus/icons-vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import {
  contentItemStatusLabelMap,
  truncateContentText
} from "@/config/content-options";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";

const props = defineProps<{
  items: ContentItem[];
  prompts?: RelatedGeoPrompt[];
  loading?: boolean;
  exportingIds?: string[];
  deletingIds?: string[];
  qualityCheckingIds?: string[];
  optimizingIds?: string[];
  canManageActions?: boolean;
}>();

const emit = defineEmits<{
  view: [item: ContentItem];
  edit: [item: ContentItem];
  export: [item: ContentItem];
  delete: [item: ContentItem];
  qualityCheck: [item: ContentItem];
  optimize: [item: ContentItem];
}>();

const findGeoPrompt = (geoPromptId?: string | null) =>
  props.prompts?.find((prompt) => prompt.id === geoPromptId);

const canManageActions = computed(() => props.canManageActions !== false);

const getItemStatusType = (status: string) => {
  if (status === "failed") {
    return "danger";
  }
  if (status === "published" || status === "ready") {
    return "success";
  }
  return "info";
};

const handleCommand = (command: string, item: ContentItem) => {
  if (command === "quality") {
    emit("qualityCheck", item);
    return;
  }

  if (command === "optimize") {
    emit("optimize", item);
    return;
  }

  if (command === "export") {
    emit("export", item);
    return;
  }

  if (command === "delete") {
    emit("delete", item);
  }
};
</script>

<template>
  <el-table
    v-loading="loading"
    :data="items"
    border
    row-key="id"
    empty-text="暂无 GEO 内容项"
    class="content-item-table"
  >
    <el-table-column label="标题" min-width="240" fixed>
      <template #default="{ row }">
        <strong class="content-item-title">{{ row.title }}</strong>
        <p class="table-subtext">{{ truncateContentText(row.body, 86) }}</p>
        <p v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</p>
      </template>
    </el-table-column>
    <el-table-column label="目标 GEO 提示词" min-width="260">
      <template #default="{ row }">
        <template v-if="findGeoPrompt(row.geoPromptId)">
          <div class="prompt-cell">
            <span>{{ findGeoPrompt(row.geoPromptId)?.promptText }}</span>
            <GeoPromptTypeTag :type="findGeoPrompt(row.geoPromptId)!.type" />
          </div>
        </template>
        <span v-else>{{ formatOptional(row.geoPromptId) }}</span>
      </template>
    </el-table-column>
    <el-table-column label="状态" width="100">
      <template #default="{ row }">
        <el-tag class="content-item-status-tag" :type="getItemStatusType(row.status)" effect="plain">
          {{ contentItemStatusLabelMap[row.status] ?? row.status }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="发布建议" min-width="170">
      <template #default="{ row }">
        {{ formatOptional(row.suggestedPublishChannel) }}
      </template>
    </el-table-column>
    <el-table-column label="更新时间" width="180">
      <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="190" fixed="right">
      <template #default="{ row }">
        <div class="content-item-table__actions">
          <el-button text type="primary" @click="emit('view', row)">查看</el-button>
          <el-button v-if="canManageActions" text type="primary" @click="emit('edit', row)">
            编辑
          </el-button>
          <el-dropdown
            v-if="canManageActions"
            trigger="click"
            @command="(command: string) => handleCommand(command, row)"
          >
            <el-button text type="primary">
              更多
              <el-icon class="el-icon--right"><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="quality">
                  {{ qualityCheckingIds?.includes(row.id) ? "检查中..." : "质量检查" }}
                </el-dropdown-item>
                <el-dropdown-item command="optimize">
                  {{ optimizingIds?.includes(row.id) ? "生成中..." : "生成发布优化版" }}
                </el-dropdown-item>
                <el-dropdown-item command="export">
                  {{ exportingIds?.includes(row.id) ? "导出中..." : "导出 Markdown" }}
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided class="content-item-danger-command">
                  {{ deletingIds?.includes(row.id) ? "删除中..." : "删除" }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.content-item-title {
  display: -webkit-box;
  overflow: hidden;
  color: #111019;
  font-weight: 900;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.content-item-table__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
}

.content-item-table__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

:global(.content-item-danger-command) {
  color: var(--el-color-danger);
}

.error-text {
  color: var(--el-color-danger);
  display: inline-block;
  max-width: 320px;
  white-space: normal;
}
</style>

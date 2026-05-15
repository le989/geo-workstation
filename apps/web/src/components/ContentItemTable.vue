<script setup lang="ts">
import type { ContentItem, RelatedGeoPrompt } from "@/api/content";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import {
  contentItemStatusLabelMap,
  formatGeoOptimizationPoints,
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

const getItemStatusType = (status: string) => {
  if (status === "failed") {
    return "danger";
  }
  if (status === "published" || status === "ready") {
    return "success";
  }
  return "info";
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
    <el-table-column label="建议发布位置" min-width="170">
      <template #default="{ row }">
        {{ formatOptional(row.suggestedPublishChannel) }}
      </template>
    </el-table-column>
    <el-table-column label="GEO 优化点" min-width="240">
      <template #default="{ row }">
        {{ formatGeoOptimizationPoints(row.geoOptimizationPoints) }}
      </template>
    </el-table-column>
    <el-table-column label="失败原因" min-width="220">
      <template #default="{ row }">
        <span v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</span>
        <span v-else>--</span>
      </template>
    </el-table-column>
    <el-table-column label="更新时间" width="180">
      <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="360" fixed="right">
      <template #default="{ row }">
        <div class="content-item-table__actions">
          <el-button text type="primary" @click="emit('view', row)">查看</el-button>
          <el-button text type="primary" @click="emit('edit', row)">编辑</el-button>
          <el-button
            text
            type="success"
            :loading="qualityCheckingIds?.includes(row.id)"
            @click="emit('qualityCheck', row)"
          >
            质量检查
          </el-button>
          <el-button
            text
            type="warning"
            :loading="optimizingIds?.includes(row.id)"
            @click="emit('optimize', row)"
          >
            生成发布优化版
          </el-button>
          <el-button
            text
            type="primary"
            :loading="exportingIds?.includes(row.id)"
            @click="emit('export', row)"
          >
            导出 Markdown
          </el-button>
          <el-button
            text
            type="danger"
            :loading="deletingIds?.includes(row.id)"
            @click="emit('delete', row)"
          >
            删除
          </el-button>
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

.error-text {
  color: var(--el-color-danger);
  display: inline-block;
  max-width: 320px;
  white-space: normal;
}
</style>

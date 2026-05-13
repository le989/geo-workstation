<script setup lang="ts">
import type { KnowledgeChunk } from "@/api/knowledge";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  formatTags,
  materialTypeLabelMap,
  sourceTypeLabelMap,
  truncateKnowledgeText
} from "@/config/knowledge-options";

defineProps<{
  chunks: KnowledgeChunk[];
  loading?: boolean;
  deletingIds?: string[];
}>();

const emit = defineEmits<{
  edit: [chunk: KnowledgeChunk];
  delete: [chunk: KnowledgeChunk];
}>();
</script>

<template>
  <el-table
    v-loading="loading"
    :data="chunks"
    class="knowledge-chunk-table"
    row-key="id"
    border
    empty-text="暂无知识片段，可先文本导入或上传 txt/md/csv 文件。"
  >
    <el-table-column prop="title" label="标题" min-width="200" fixed="left">
      <template #default="{ row }: { row: KnowledgeChunk }">
        <strong class="knowledge-main-text">{{ row.title }}</strong>
      </template>
    </el-table-column>
    <el-table-column prop="content" label="内容摘要" min-width="320">
      <template #default="{ row }: { row: KnowledgeChunk }">
        <span class="knowledge-content-summary">{{ truncateKnowledgeText(row.content, 120) }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="sourceType" label="来源" width="112">
      <template #default="{ row }: { row: KnowledgeChunk }">
        {{ sourceTypeLabelMap[row.sourceType] ?? row.sourceType }}
      </template>
    </el-table-column>
    <el-table-column prop="productLine" label="产品线" min-width="130">
      <template #default="{ row }: { row: KnowledgeChunk }">
        {{ formatOptional(row.productLine) }}
      </template>
    </el-table-column>
    <el-table-column prop="materialType" label="资料类型" min-width="126">
      <template #default="{ row }: { row: KnowledgeChunk }">
        {{ materialTypeLabelMap[row.materialType ?? ""] ?? formatOptional(row.materialType) }}
      </template>
    </el-table-column>
    <el-table-column prop="tags" label="标签" min-width="150">
      <template #default="{ row }: { row: KnowledgeChunk }">
        {{ formatTags(row.tags) }}
      </template>
    </el-table-column>
    <el-table-column prop="updatedAt" label="更新时间" min-width="168">
      <template #default="{ row }: { row: KnowledgeChunk }">
        {{ formatDateTime(row.updatedAt) }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="124" fixed="right">
      <template #default="{ row }: { row: KnowledgeChunk }">
        <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
        <el-button
          link
          type="danger"
          :loading="deletingIds?.includes(row.id)"
          @click="emit('delete', row)"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty description="暂无知识片段，可先文本导入或上传 txt/md/csv 文件。">
        <template #image>
          <div class="empty-mark">GEO</div>
        </template>
      </el-empty>
    </template>
  </el-table>
</template>

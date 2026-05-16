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
  canManage?: boolean;
}>();

const emit = defineEmits<{
  edit: [chunk: KnowledgeChunk];
  delete: [chunk: KnowledgeChunk];
}>();

const getWordCount = (value?: string) => (value ? value.length : 0);
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
    <el-table-column prop="title" label="片段" min-width="250" fixed="left">
      <template #default="{ row }: { row: KnowledgeChunk }">
        <div class="knowledge-chunk-title">
          <strong class="knowledge-main-text">{{ row.title }}</strong>
          <el-tag class="knowledge-source-tag" effect="plain">
            {{ sourceTypeLabelMap[row.sourceType] ?? row.sourceType }}
          </el-tag>
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="content" label="内容摘要" min-width="360">
      <template #default="{ row }: { row: KnowledgeChunk }">
        <div class="knowledge-content-preview">
          <span class="knowledge-content-summary">{{ truncateKnowledgeText(row.content, 150) }}</span>
          <div class="knowledge-content-meta">
            <small>{{ getWordCount(row.content) }} 字</small>
            <el-popover placement="left" trigger="click" width="560">
              <template #reference>
                <el-button link type="primary">展开阅读全文</el-button>
              </template>
              <div class="knowledge-full-content">
                <strong>{{ row.title }}</strong>
                <pre>{{ row.content }}</pre>
              </div>
            </el-popover>
          </div>
        </div>
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
        <template v-if="canManage">
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
        <span v-else class="muted-table-action">只读</span>
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

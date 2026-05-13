<script setup lang="ts">
import type { KnowledgeFile } from "@/api/knowledge";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { formatFileSize } from "@/config/knowledge-options";
import KnowledgeParseStatusTag from "./KnowledgeParseStatusTag.vue";

defineProps<{
  files: KnowledgeFile[];
  loading?: boolean;
  reparsingIds?: string[];
  deletingIds?: string[];
}>();

const emit = defineEmits<{
  detail: [file: KnowledgeFile];
  reparse: [file: KnowledgeFile];
  delete: [file: KnowledgeFile];
}>();
</script>

<template>
  <el-table
    v-loading="loading"
    :data="files"
    class="knowledge-file-table"
    row-key="id"
    border
    empty-text="暂无文件资料，可上传 txt/md/csv 解析为 GEO 知识片段。"
  >
    <el-table-column prop="fileName" label="文件名" min-width="220" fixed="left">
      <template #default="{ row }: { row: KnowledgeFile }">
        <strong class="knowledge-main-text">{{ row.fileName }}</strong>
      </template>
    </el-table-column>
    <el-table-column prop="fileType" label="类型" width="92">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ row.fileType }}
      </template>
    </el-table-column>
    <el-table-column prop="fileSize" label="大小" width="104">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ formatFileSize(row.fileSize) }}
      </template>
    </el-table-column>
    <el-table-column prop="parseStatus" label="解析状态" width="116">
      <template #default="{ row }: { row: KnowledgeFile }">
        <KnowledgeParseStatusTag :status="row.parseStatus" />
      </template>
    </el-table-column>
    <el-table-column prop="errorMessage" label="错误信息" min-width="220">
      <template #default="{ row }: { row: KnowledgeFile }">
        <span :class="{ 'knowledge-error-text': row.errorMessage }">
          {{ formatOptional(row.errorMessage) }}
        </span>
      </template>
    </el-table-column>
    <el-table-column prop="createdAt" label="上传时间" min-width="168">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ formatDateTime(row.createdAt) }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="190" fixed="right">
      <template #default="{ row }: { row: KnowledgeFile }">
        <el-button link type="primary" @click="emit('detail', row)">查看详情</el-button>
        <el-button
          link
          type="warning"
          :loading="reparsingIds?.includes(row.id)"
          @click="emit('reparse', row)"
        >
          重新解析
        </el-button>
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
      <el-empty description="暂无文件资料，可上传 txt/md/csv 解析为 GEO 知识片段。">
        <template #image>
          <div class="empty-mark">GEO</div>
        </template>
      </el-empty>
    </template>
  </el-table>
</template>

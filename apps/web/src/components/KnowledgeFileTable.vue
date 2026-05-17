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
  canManage?: boolean;
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
    <el-table-column type="expand" width="44">
      <template #default="{ row }: { row: KnowledgeFile }">
        <div class="knowledge-file-detail">
          <section>
            <p class="section-kicker">资料信息</p>
            <dl>
              <div>
                <dt>文件大小</dt>
                <dd>{{ formatFileSize(row.fileSize) }}</dd>
              </div>
              <div>
                <dt>上传时间</dt>
                <dd>{{ formatDateTime(row.createdAt) }}</dd>
              </div>
            </dl>
          </section>
          <section>
            <p class="section-kicker">排查信息</p>
            <dl>
              <div>
                <dt>错误信息</dt>
                <dd>
                  <span :class="{ 'knowledge-error-text': row.errorMessage }">
                    {{ formatOptional(row.errorMessage) }}
                  </span>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="fileName" label="资料标题" min-width="240" fixed="left">
      <template #default="{ row }: { row: KnowledgeFile }">
        <strong class="knowledge-main-text">{{ row.fileName }}</strong>
        <small v-if="row.errorMessage" class="knowledge-file-warning">解析异常，展开查看原因</small>
      </template>
    </el-table-column>
    <el-table-column prop="fileType" label="来源类型" width="112">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ row.fileType }}
      </template>
    </el-table-column>
    <el-table-column prop="parseStatus" label="解析状态" width="116">
      <template #default="{ row }: { row: KnowledgeFile }">
        <KnowledgeParseStatusTag :status="row.parseStatus" />
      </template>
    </el-table-column>
    <el-table-column prop="updatedAt" label="更新时间" min-width="168">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ formatDateTime(row.updatedAt) }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="190" fixed="right">
      <template #default="{ row }: { row: KnowledgeFile }">
        <el-button link type="primary" @click="emit('detail', row)">查看详情</el-button>
        <template v-if="canManage">
          <el-button
            link
            class="knowledge-secondary-action"
            :loading="reparsingIds?.includes(row.id)"
            @click="emit('reparse', row)"
          >
            重新解析
          </el-button>
          <el-button
            link
            class="knowledge-danger-action"
            :loading="deletingIds?.includes(row.id)"
            @click="emit('delete', row)"
          >
            删除
          </el-button>
        </template>
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

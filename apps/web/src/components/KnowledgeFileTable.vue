<script setup lang="ts">
import type { KnowledgeFile } from "@/api/knowledge";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  applicableModuleLabelMap,
  formatFileSize,
  materialTypeLabelMap,
  reviewStatusLabelMap,
  sourceTypeLabelMap,
  trustLevelLabelMap
} from "@/config/knowledge-options";
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

const formatApplicableModules = (modules?: KnowledgeFile["applicableModules"]) =>
  modules && modules.length > 0
    ? modules.map((item) => applicableModuleLabelMap[item] ?? item).join("、")
    : "--";

const formatAllowedDepartments = (ids?: string[]) => (ids && ids.length > 0 ? `${ids.length} 个部门` : "--");
</script>

<template>
  <el-table
    v-loading="loading"
    :data="files"
    class="knowledge-file-table"
    row-key="id"
    border
    empty-text="暂无文件资料，可上传 txt/md/csv/Excel/Word 或手动录入资料。"
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
                <dt>来源说明</dt>
                <dd>{{ formatOptional(row.sourceDescription) }}</dd>
              </div>
              <div>
                <dt>适用模块</dt>
                <dd>{{ formatApplicableModules(row.applicableModules) }}</dd>
              </div>
              <div>
                <dt>售后可见部门</dt>
                <dd>{{ formatAllowedDepartments(row.allowedDepartmentIds) }}</dd>
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
    <el-table-column prop="title" label="资料标题" min-width="240" fixed="left">
      <template #default="{ row }: { row: KnowledgeFile }">
        <strong class="knowledge-main-text">{{ row.title || row.fileName }}</strong>
        <small>{{ row.fileName }}</small>
        <small v-if="row.errorMessage" class="knowledge-file-warning">解析异常，展开查看原因</small>
      </template>
    </el-table-column>
    <el-table-column prop="fileType" label="来源类型" width="112">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ sourceTypeLabelMap[row.sourceType] ?? row.sourceType }} / {{ row.fileType }}
      </template>
    </el-table-column>
    <el-table-column prop="materialType" label="资料类型" min-width="142">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ materialTypeLabelMap[row.materialType] ?? row.materialType }}
      </template>
    </el-table-column>
    <el-table-column prop="reviewStatus" label="审核状态" width="116">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ reviewStatusLabelMap[row.reviewStatus] ?? row.reviewStatus }}
      </template>
    </el-table-column>
    <el-table-column prop="trustLevel" label="可信度" width="96">
      <template #default="{ row }: { row: KnowledgeFile }">
        {{ trustLevelLabelMap[row.trustLevel] ?? row.trustLevel }}
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
            v-if="row.fileType !== 'manual'"
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
      <el-empty description="暂无文件资料，可上传文件或手动录入资料。">
        <template #image>
          <div class="empty-mark">GEO</div>
        </template>
      </el-empty>
    </template>
  </el-table>
</template>

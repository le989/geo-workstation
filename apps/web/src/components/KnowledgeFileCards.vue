<script setup lang="ts">
import type { KnowledgeFile } from "@/api/knowledge";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  applicableModuleLabelMap,
  formatFileSize,
  materialTopicLabelMap,
  materialTypeLabelMap,
  reviewStatusLabelMap,
  sourceTypeLabelMap,
  trustLevelLabelMap
} from "@/config/knowledge-options";
import {
  getKnowledgeFileCitationDescription,
  getKnowledgeFileCitationLabel,
  isKnowledgeFileOfficiallyCitable
} from "@/utils/knowledge-citation";
import { formatKnowledgeSourceDescription } from "@/utils/knowledge-source";
import KnowledgeParseStatusTag from "./KnowledgeParseStatusTag.vue";

defineProps<{
  files: KnowledgeFile[];
  loading?: boolean;
  reparsingIds?: string[];
  deletingIds?: string[];
  canManage?: boolean;
  knowledgeBaseName?: string;
}>();

const emit = defineEmits<{
  detail: [file: KnowledgeFile];
  edit: [file: KnowledgeFile];
  reparse: [file: KnowledgeFile];
  delete: [file: KnowledgeFile];
}>();

const formatApplicableModules = (modules?: KnowledgeFile["applicableModules"]) =>
  modules && modules.length > 0
    ? modules.map((item) => applicableModuleLabelMap[item] ?? item).join("、")
    : "--";

const formatMaterialTopic = (value?: string) =>
  materialTopicLabelMap[value ?? ""] ?? formatOptional(value);

const formatDirectoryName = (file: KnowledgeFile, fallbackName?: string) =>
  formatOptional(file.directoryName ?? fallbackName);
</script>

<template>
  <div v-loading="loading" class="knowledge-file-card-list">
    <el-empty v-if="!loading && files.length === 0" description="没有符合条件的资料">
      <template #image>
        <div class="empty-mark">KB</div>
      </template>
    </el-empty>

    <article v-for="file in files" :key="file.id" class="knowledge-file-card">
      <div class="knowledge-file-card__main">
        <div class="knowledge-file-card__title-row">
          <div>
            <h4>{{ file.title || file.fileName }}</h4>
            <p>{{ file.fileName }}</p>
          </div>
          <el-tag
            :type="isKnowledgeFileOfficiallyCitable(file) ? 'success' : 'warning'"
            effect="plain"
          >
            {{ getKnowledgeFileCitationLabel(file) }}
          </el-tag>
        </div>

        <div class="knowledge-file-card__tags">
          <el-tag size="small" effect="plain">
            {{ materialTypeLabelMap[file.materialType] ?? file.materialType }}
          </el-tag>
          <el-tag size="small" type="info" effect="plain">
            {{ formatMaterialTopic(file.materialTopic) }}
          </el-tag>
          <el-tag size="small" type="info" effect="plain">
            {{ reviewStatusLabelMap[file.reviewStatus] ?? file.reviewStatus }}
          </el-tag>
          <el-tag size="small" type="info" effect="plain">
            可信度 {{ trustLevelLabelMap[file.trustLevel] ?? file.trustLevel }}
          </el-tag>
        </div>

        <dl class="knowledge-file-card__meta">
          <div>
            <dt>所属目录</dt>
            <dd>
              {{ formatDirectoryName(file, knowledgeBaseName) }}
              <el-tag
                v-if="file.directoryStatus === 'disabled'"
                size="small"
                type="info"
                effect="plain"
              >
                已停用
              </el-tag>
            </dd>
          </div>
          <div>
            <dt>适用模块</dt>
            <dd>{{ formatApplicableModules(file.applicableModules) }}</dd>
          </div>
          <div>
            <dt>正式引用状态</dt>
            <dd>{{ getKnowledgeFileCitationDescription(file) }}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>
              {{ sourceTypeLabelMap[file.sourceType] ?? file.sourceType }} /
              {{ file.fileType }} / {{ formatFileSize(file.fileSize) }}
            </dd>
          </div>
          <div>
            <dt>来源说明</dt>
            <dd>{{ formatOptional(formatKnowledgeSourceDescription(file.sourceDescription)) }}</dd>
          </div>
          <div>
            <dt>更新时间</dt>
            <dd>{{ formatDateTime(file.updatedAt) }}</dd>
          </div>
        </dl>
      </div>

      <div class="knowledge-file-card__side">
        <KnowledgeParseStatusTag :status="file.parseStatus" />
        <el-button link type="primary" @click="emit('detail', file)">查看详情</el-button>
        <template v-if="canManage">
          <el-button link type="primary" @click="emit('edit', file)">编辑资料</el-button>
          <el-button
            v-if="file.fileType !== 'manual'"
            link
            :loading="reparsingIds?.includes(file.id)"
            @click="emit('reparse', file)"
          >
            重新解析
          </el-button>
          <el-button
            link
            type="danger"
            :loading="deletingIds?.includes(file.id)"
            @click="emit('delete', file)"
          >
            删除
          </el-button>
        </template>
      </div>
    </article>
  </div>
</template>

<style scoped>
.knowledge-file-card-list {
  min-height: 180px;
  display: grid;
  gap: 12px;
}

.knowledge-file-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.knowledge-file-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.knowledge-file-card h4 {
  margin: 0;
  color: #111827;
  font-size: 15px;
}

.knowledge-file-card p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.knowledge-file-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.knowledge-file-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.knowledge-file-card__meta div {
  min-width: 0;
}

.knowledge-file-card__meta dt {
  color: #6b7280;
  font-size: 12px;
}

.knowledge-file-card__meta dd {
  margin: 3px 0 0;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.knowledge-file-card__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 86px;
}

@media (max-width: 900px) {
  .knowledge-file-card {
    grid-template-columns: 1fr;
  }

  .knowledge-file-card__side {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .knowledge-file-card__meta {
    grid-template-columns: 1fr;
  }
}
</style>

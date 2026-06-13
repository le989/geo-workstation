<script setup lang="ts">
import type { KnowledgeFile } from "@/api/knowledge";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  applicableModuleLabelMap,
  formatFileSize,
  inferEvidenceType,
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

withDefaults(defineProps<{
  files: KnowledgeFile[];
  loading?: boolean;
  reparsingIds?: string[];
  deletingIds?: string[];
  canManage?: boolean;
  knowledgeBaseName?: string;
  displayMode?: "simple" | "management";
}>(), {
  canManage: false,
  deletingIds: () => [],
  displayMode: "simple",
  knowledgeBaseName: "",
  loading: false,
  reparsingIds: () => []
});

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

const getEvidenceType = (file: KnowledgeFile) => inferEvidenceType(file);

const isForbiddenEvidence = (file: KnowledgeFile) =>
  getEvidenceType(file).value === "forbidden_expression";
</script>

<template>
  <div v-loading="loading" class="knowledge-file-card-list kb-asset-list">
    <el-empty v-if="!loading && files.length === 0" description="没有符合条件的资料">
      <template #image>
        <div class="empty-mark">KB</div>
      </template>
    </el-empty>

    <article v-for="file in files" :key="file.id" class="knowledge-file-card kb-asset-row">
      <div class="knowledge-file-card__main kb-asset-row__main">
        <h4>{{ file.title || file.fileName }}</h4>
        <p class="kb-asset-row__subtitle">{{ file.fileName }}</p>

        <div class="kb-asset-row__meta-line" aria-label="资料摘要">
          <span>{{ materialTypeLabelMap[file.materialType] ?? file.materialType }}</span>
          <span>{{ formatDirectoryName(file, knowledgeBaseName) }}</span>
          <span>{{ sourceTypeLabelMap[file.sourceType] ?? file.sourceType }} / {{ file.fileType }}</span>
          <span>{{ formatFileSize(file.fileSize) }}</span>
          <span>更新 {{ formatDateTime(file.updatedAt) }}</span>
        </div>

        <p v-if="displayMode === 'management'" class="kb-asset-row__summary">
          {{ formatOptional(formatKnowledgeSourceDescription(file.sourceDescription)) }}
        </p>
      </div>

      <div class="knowledge-file-card__status kb-asset-row__status">
        <el-tag
          :type="isKnowledgeFileOfficiallyCitable(file) ? 'success' : 'warning'"
          effect="plain"
        >
          {{ getKnowledgeFileCitationLabel(file) }}
        </el-tag>
        <el-tag size="small" type="info" effect="plain">
          {{ reviewStatusLabelMap[file.reviewStatus] ?? file.reviewStatus }}
        </el-tag>
        <el-tag
          size="small"
          :type="isForbiddenEvidence(file) ? 'warning' : 'info'"
          effect="plain"
        >
          {{ getEvidenceType(file).label }}
        </el-tag>
        <el-tag
          v-if="file.directoryStatus === 'disabled'"
          size="small"
          type="info"
          effect="plain"
        >
          目录已停用
        </el-tag>
        <KnowledgeParseStatusTag v-if="displayMode === 'management'" :status="file.parseStatus" />
        <small>{{ getKnowledgeFileCitationDescription(file) }}</small>
        <small v-if="displayMode === 'management'">
          {{ formatMaterialTopic(file.materialTopic) }} ·
          {{ trustLevelLabelMap[file.trustLevel] ?? file.trustLevel }} ·
          {{ formatApplicableModules(file.applicableModules) }}
        </small>
      </div>

      <div class="knowledge-file-card__side kb-asset-row__actions">
        <el-button link type="primary" @click="emit('detail', file)">查看详情</el-button>
        <template v-if="canManage">
          <el-button link type="primary" @click="emit('edit', file)">编辑资料</el-button>
          <el-button
            v-if="displayMode === 'management' && file.fileType !== 'manual'"
            link
            :loading="reparsingIds?.includes(file.id)"
            @click="emit('reparse', file)"
          >
            重新解析
          </el-button>
          <el-button
            v-if="displayMode === 'management'"
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
  gap: 0;
}

.knowledge-file-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) minmax(96px, auto);
  gap: 18px;
  align-items: center;
  padding: 14px 4px;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  background: #fff;
}

.knowledge-file-card:first-of-type {
  border-top: 1px solid #e5e7eb;
}

.knowledge-file-card:hover {
  background: #f8fafc;
}

.knowledge-file-card__main {
  min-width: 0;
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

.kb-asset-row__subtitle,
.kb-asset-row__summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-asset-row__meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.kb-asset-row__meta-line span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
}

.kb-asset-row__meta-line span + span::before {
  width: 1px;
  height: 10px;
  margin-right: 10px;
  background: #cbd5e1;
  content: "";
}

.knowledge-file-card__status {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.knowledge-file-card__status small {
  display: block;
  width: 100%;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
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
    gap: 10px;
    padding: 14px 0;
  }

  .knowledge-file-card__side {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .knowledge-file-card__status {
    align-items: flex-start;
  }
}
</style>

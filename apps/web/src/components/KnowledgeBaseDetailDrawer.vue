<script setup lang="ts">
import { reactive, watch } from "vue";
import type {
  KnowledgeBaseDetail,
  KnowledgeChunk,
  KnowledgeChunkQuery,
  KnowledgeFile,
  KnowledgeFileQuery,
  ParseStatus,
  TextImportPayload,
  UploadKnowledgeFileExtraFields
} from "@/api/knowledge";
import { formatDateTime, formatOptional, splitCommaValues } from "@/config/geo-prompt-options";
import {
  knowledgeBaseStatusLabelMap,
  materialTypeOptions,
  parseStatusOptions,
  sourceTypeOptions
} from "@/config/knowledge-options";
import KnowledgeChunkTable from "./KnowledgeChunkTable.vue";
import KnowledgeFileTable from "./KnowledgeFileTable.vue";
import KnowledgeFileUpload from "./KnowledgeFileUpload.vue";
import KnowledgeTextImportForm from "./KnowledgeTextImportForm.vue";

const props = defineProps<{
  modelValue: boolean;
  detail?: KnowledgeBaseDetail | null;
  detailLoading?: boolean;
  activeTab: "chunks" | "files" | "text-import";
  chunks: KnowledgeChunk[];
  chunksTotal: number;
  chunksPage: number;
  chunksPageSize: number;
  chunksLoading?: boolean;
  files: KnowledgeFile[];
  filesTotal: number;
  filesPage: number;
  filesPageSize: number;
  filesLoading?: boolean;
  textImportSubmitting?: boolean;
  uploading?: boolean;
  reparsingIds?: string[];
  deletingFileIds?: string[];
  deletingChunkIds?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:activeTab": [value: "chunks" | "files" | "text-import"];
  refresh: [];
  "text-import": [payload: TextImportPayload];
  "upload-file": [payload: { file: File; extraFields: UploadKnowledgeFileExtraFields }];
  "search-chunks": [query: KnowledgeChunkQuery];
  "reset-chunks": [];
  "page-chunks": [page: number];
  "size-chunks": [pageSize: number];
  "edit-chunk": [chunk: KnowledgeChunk];
  "delete-chunk": [chunk: KnowledgeChunk];
  "search-files": [query: KnowledgeFileQuery];
  "reset-files": [];
  "page-files": [page: number];
  "size-files": [pageSize: number];
  "file-detail": [file: KnowledgeFile];
  "reparse-file": [file: KnowledgeFile];
  "delete-file": [file: KnowledgeFile];
}>();

const chunkFilters = reactive({
  materialType: "",
  productLine: "",
  search: "",
  sourceType: "",
  tagsText: ""
});

const fileFilters = reactive({
  fileType: "",
  parseStatus: "" as ParseStatus | "",
  search: ""
});

watch(
  () => props.detail?.knowledgeBase.id,
  () => {
    chunkFilters.materialType = "";
    chunkFilters.productLine = "";
    chunkFilters.search = "";
    chunkFilters.sourceType = "";
    chunkFilters.tagsText = "";
    fileFilters.fileType = "";
    fileFilters.parseStatus = "";
    fileFilters.search = "";
  }
);

const close = () => {
  emit("update:modelValue", false);
};

const handleChunkSearch = () => {
  emit("search-chunks", {
    materialType: chunkFilters.materialType || undefined,
    productLine: chunkFilters.productLine.trim() || undefined,
    search: chunkFilters.search.trim() || undefined,
    sourceType: chunkFilters.sourceType || undefined,
    tags: splitCommaValues(chunkFilters.tagsText)
  });
};

const handleChunkReset = () => {
  chunkFilters.materialType = "";
  chunkFilters.productLine = "";
  chunkFilters.search = "";
  chunkFilters.sourceType = "";
  chunkFilters.tagsText = "";
  emit("reset-chunks");
};

const handleFileSearch = () => {
  emit("search-files", {
    fileType: fileFilters.fileType.trim() || undefined,
    parseStatus: fileFilters.parseStatus || undefined,
    search: fileFilters.search.trim() || undefined
  });
};

const handleFileReset = () => {
  fileFilters.fileType = "";
  fileFilters.parseStatus = "";
  fileFilters.search = "";
  emit("reset-files");
};

const getKnowledgeBaseStatusLabel = (status: string) =>
  knowledgeBaseStatusLabelMap[status] ?? status;
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="82%"
    :with-header="false"
    class="knowledge-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="knowledge-detail">
      <div class="knowledge-detail-header">
        <div>
          <el-tag type="success" effect="plain">企业 GEO 知识库</el-tag>
          <h2>{{ detail?.knowledgeBase.name ?? "企业 GEO 知识库详情" }}</h2>
          <p>
            AI
            应该引用哪些企业事实资料？在这里查看文件解析状态、知识片段质量和可用于内容生成的资料底座。
          </p>
        </div>
        <div class="knowledge-detail-actions">
          <el-button :loading="detailLoading" @click="emit('refresh')">刷新详情</el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-skeleton v-if="detailLoading && !detail" :rows="6" animated />

      <template v-else-if="detail">
        <el-descriptions :column="3" border class="knowledge-detail-summary">
          <el-descriptions-item label="知识库名称">
            {{ detail.knowledgeBase.name }}
          </el-descriptions-item>
          <el-descriptions-item label="产品线">
            {{ formatOptional(detail.knowledgeBase.productLine) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ getKnowledgeBaseStatusLabel(detail.knowledgeBase.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="文件数">
            {{ detail.filesCount }}
          </el-descriptions-item>
          <el-descriptions-item label="知识片段数">
            {{ detail.chunksCount }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detail.knowledgeBase.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="说明" :span="3">
            {{ formatOptional(detail.knowledgeBase.description) }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="knowledge-operation-grid">
          <button
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'chunks')"
          >
            <span>知识片段</span>
            <strong>{{ detail.chunksCount }} 条可引用资料</strong>
            <small>查看、筛选和编辑企业事实资料，支撑后续 GEO 内容生成。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'files')"
          >
            <span>文件资料</span>
            <strong>{{ detail.filesCount }} 个解析文件</strong>
            <small>跟踪 txt / md / csv 的解析状态，失败后可重新解析。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'text-import')"
          >
            <span>文本导入</span>
            <strong>快速补充事实资料</strong>
            <small>适合先录入产品说明、FAQ、场景资料和选型边界。</small>
          </button>
        </section>

        <el-tabs
          :model-value="activeTab"
          class="knowledge-detail-tabs"
          @tab-change="emit('update:activeTab', $event as 'chunks' | 'files' | 'text-import')"
        >
          <el-tab-pane label="知识片段" name="chunks">
            <section class="knowledge-tab-panel">
              <div class="knowledge-tab-header">
                <div>
                  <p class="section-kicker">知识片段</p>
                  <h3>可被 GEO 内容引用的知识片段</h3>
                  <p>查看、筛选和编辑企业事实资料，避免把知识库做成普通文件柜。</p>
                </div>
              </div>

              <el-form class="knowledge-inner-filters" label-position="top">
                <el-form-item label="搜索">
                  <el-input
                    v-model="chunkFilters.search"
                    clearable
                    placeholder="搜索标题或内容"
                    @keyup.enter="handleChunkSearch"
                  />
                </el-form-item>
                <el-form-item label="来源类型">
                  <el-select v-model="chunkFilters.sourceType" clearable placeholder="全部来源">
                    <el-option
                      v-for="option in sourceTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="产品线">
                  <el-input v-model="chunkFilters.productLine" clearable placeholder="产品线" />
                </el-form-item>
                <el-form-item label="资料类型">
                  <el-select v-model="chunkFilters.materialType" clearable placeholder="全部资料">
                    <el-option
                      v-for="option in materialTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="标签">
                  <el-input v-model="chunkFilters.tagsText" clearable placeholder="标签关键词" />
                </el-form-item>
              </el-form>

              <div class="knowledge-actions">
                <el-button type="primary" :loading="chunksLoading" @click="handleChunkSearch">
                  查询片段
                </el-button>
                <el-button @click="handleChunkReset">重置</el-button>
              </div>

              <KnowledgeChunkTable
                :chunks="chunks"
                :loading="chunksLoading"
                :deleting-ids="deletingChunkIds"
                @edit="emit('edit-chunk', $event)"
                @delete="emit('delete-chunk', $event)"
              />

              <div class="knowledge-pagination">
                <span>共 {{ chunksTotal }} 条知识片段</span>
                <el-pagination
                  :current-page="chunksPage"
                  :page-size="chunksPageSize"
                  :page-sizes="[10, 20, 50]"
                  :total="chunksTotal"
                  layout="sizes, prev, pager, next"
                  @current-change="emit('page-chunks', $event)"
                  @size-change="emit('size-chunks', $event)"
                />
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane label="文件资料" name="files">
            <KnowledgeFileUpload :uploading="uploading" @upload="emit('upload-file', $event)" />

            <section class="knowledge-tab-panel">
              <div class="knowledge-tab-header">
                <div>
                  <p class="section-kicker">解析文件</p>
                  <h3>文件解析状态</h3>
                  <p>解析失败会保留错误信息，可重新解析；删除文件会同步软删除关联知识片段。</p>
                </div>
              </div>

              <el-form class="knowledge-inner-filters" label-position="top">
                <el-form-item label="搜索文件名">
                  <el-input
                    v-model="fileFilters.search"
                    clearable
                    placeholder="搜索文件名"
                    @keyup.enter="handleFileSearch"
                  />
                </el-form-item>
                <el-form-item label="解析状态">
                  <el-select v-model="fileFilters.parseStatus" clearable placeholder="全部状态">
                    <el-option
                      v-for="option in parseStatusOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="文件类型">
                  <el-select v-model="fileFilters.fileType" clearable placeholder="全部类型">
                    <el-option label="txt" value="txt" />
                    <el-option label="md" value="md" />
                    <el-option label="csv" value="csv" />
                  </el-select>
                </el-form-item>
              </el-form>

              <div class="knowledge-actions">
                <el-button type="primary" :loading="filesLoading" @click="handleFileSearch">
                  查询文件
                </el-button>
                <el-button @click="handleFileReset">重置</el-button>
              </div>

              <KnowledgeFileTable
                :files="files"
                :loading="filesLoading"
                :reparsing-ids="reparsingIds"
                :deleting-ids="deletingFileIds"
                @detail="emit('file-detail', $event)"
                @reparse="emit('reparse-file', $event)"
                @delete="emit('delete-file', $event)"
              />

              <div class="knowledge-pagination">
                <span>共 {{ filesTotal }} 个文件资料</span>
                <el-pagination
                  :current-page="filesPage"
                  :page-size="filesPageSize"
                  :page-sizes="[10, 20, 50]"
                  :total="filesTotal"
                  layout="sizes, prev, pager, next"
                  @current-change="emit('page-files', $event)"
                  @size-change="emit('size-files', $event)"
                />
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane label="文本导入" name="text-import">
            <KnowledgeTextImportForm
              :default-product-line="detail.knowledgeBase.productLine"
              :submitting="textImportSubmitting"
              @submit="emit('text-import', $event)"
            />
          </el-tab-pane>
        </el-tabs>
      </template>
    </section>
  </el-drawer>
</template>

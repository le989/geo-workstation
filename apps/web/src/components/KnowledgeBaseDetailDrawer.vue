<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { Department } from "@/api/departments";
import type {
  KnowledgeApplicableModule,
  KnowledgeBaseDetail,
  KnowledgeChunk,
  KnowledgeChunkQuery,
  KnowledgeFile,
  KnowledgeFileQuery,
  KnowledgeOfficialCitationStatus,
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  ManualKnowledgeMaterialPayload,
  ParseStatus,
  UploadKnowledgeFileExtraFields
} from "@/api/knowledge";
import { formatDateTime, formatOptional, splitCommaValues } from "@/config/geo-prompt-options";
import {
  applicableModuleOptions,
  knowledgeBaseStatusLabelMap,
  materialTopicOptions,
  materialTypeOptions,
  officialCitationStatusOptions,
  parseStatusOptions,
  reviewStatusOptions,
  sourceTypeOptions,
  trustLevelOptions
} from "@/config/knowledge-options";
import KnowledgeChunkTable from "./KnowledgeChunkTable.vue";
import KnowledgeFileCards from "./KnowledgeFileCards.vue";
import KnowledgeFileTable from "./KnowledgeFileTable.vue";
import KnowledgeMaterialIngestWizard from "./KnowledgeMaterialIngestWizard.vue";

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
  canManage?: boolean;
  canReview?: boolean;
  departments?: Department[];
  reparsingIds?: string[];
  deletingFileIds?: string[];
  deletingChunkIds?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:activeTab": [value: "chunks" | "files" | "text-import"];
  refresh: [];
  "text-import": [payload: ManualKnowledgeMaterialPayload];
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

const showChunkAdvancedFilters = ref(false);

const fileFilters = reactive({
  applicableModule: "" as KnowledgeApplicableModule | "",
  fileType: "",
  materialType: "",
  materialTopic: "",
  officialCitationStatus: "" as KnowledgeOfficialCitationStatus | "",
  parseStatus: "" as ParseStatus | "",
  reviewStatus: "" as KnowledgeReviewStatus | "",
  search: "",
  trustLevel: "" as KnowledgeTrustLevel | ""
});
const fileViewMode = ref<"card" | "table">("table");

watch(
  () => props.detail?.knowledgeBase.id,
  () => {
    chunkFilters.materialType = "";
    chunkFilters.productLine = "";
    chunkFilters.search = "";
    chunkFilters.sourceType = "";
    chunkFilters.tagsText = "";
    showChunkAdvancedFilters.value = false;
    fileFilters.fileType = "";
    fileFilters.materialType = "";
    fileFilters.materialTopic = "";
    fileFilters.officialCitationStatus = "";
    fileFilters.parseStatus = "";
    fileFilters.reviewStatus = "";
    fileFilters.search = "";
    fileFilters.trustLevel = "";
    fileFilters.applicableModule = "";
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
  showChunkAdvancedFilters.value = false;
  emit("reset-chunks");
};

const handleFileSearch = () => {
  emit("search-files", {
    applicableModule: fileFilters.applicableModule || undefined,
    fileType: fileFilters.fileType.trim() || undefined,
    materialType: fileFilters.materialType || undefined,
    materialTopic: fileFilters.materialTopic || undefined,
    officialCitationStatus: fileFilters.officialCitationStatus || undefined,
    parseStatus: fileFilters.parseStatus || undefined,
    reviewStatus: fileFilters.reviewStatus || undefined,
    search: fileFilters.search.trim() || undefined,
    trustLevel: fileFilters.trustLevel || undefined
  });
};

const handleFileReset = () => {
  fileFilters.applicableModule = "";
  fileFilters.fileType = "";
  fileFilters.materialType = "";
  fileFilters.materialTopic = "";
  fileFilters.officialCitationStatus = "";
  fileFilters.parseStatus = "";
  fileFilters.reviewStatus = "";
  fileFilters.search = "";
  fileFilters.trustLevel = "";
  emit("reset-files");
};

const getKnowledgeBaseStatusLabel = (status: string) =>
  knowledgeBaseStatusLabelMap[status] ?? status;

const hasFileFilters = computed(() =>
  Boolean(
    fileFilters.applicableModule ||
      fileFilters.fileType ||
      fileFilters.materialType ||
      fileFilters.materialTopic ||
      fileFilters.officialCitationStatus ||
      fileFilters.parseStatus ||
      fileFilters.reviewStatus ||
      fileFilters.search.trim() ||
      fileFilters.trustLevel
  )
);
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
        <div class="knowledge-detail-header__copy">
          <el-tag class="knowledge-detail-header__tag" type="success" effect="plain">
            企业 GEO 知识库
          </el-tag>
          <h2>{{ detail?.knowledgeBase.name ?? "企业 GEO 知识库详情" }}</h2>
          <p>
            AI 应该引用哪些企业事实资料？在这里查看文件解析状态、知识片段质量和可用于内容生成的资料底座。
          </p>
        </div>
        <div class="knowledge-detail-actions">
          <el-button :loading="detailLoading" @click="emit('refresh')">刷新详情</el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-skeleton v-if="detailLoading && !detail" :rows="6" animated />

      <template v-else-if="detail">
        <section class="knowledge-readable-section">
          <div class="knowledge-readable-section__header">
            <div>
              <p class="section-kicker">基本信息</p>
              <h3>资料底座概况</h3>
            </div>
            <el-tag class="knowledge-status-tag" effect="plain">
              {{ getKnowledgeBaseStatusLabel(detail.knowledgeBase.status) }}
            </el-tag>
          </div>
          <div class="knowledge-detail-card-grid">
            <article>
              <span>产品线</span>
              <strong>{{ formatOptional(detail.knowledgeBase.productLine) }}</strong>
            </article>
            <article>
              <span>资料文件</span>
              <strong>{{ detail.filesCount }} 个</strong>
            </article>
            <article>
              <span>知识片段</span>
              <strong>{{ detail.chunksCount }} 条</strong>
            </article>
            <article>
              <span>更新时间</span>
              <strong>{{ formatDateTime(detail.knowledgeBase.updatedAt) }}</strong>
            </article>
          </div>
          <p class="knowledge-readable-summary">
            {{ formatOptional(detail.knowledgeBase.description) }}
          </p>
        </section>

        <el-alert
          v-if="detail.chunksCount === 0"
          title="当前知识库还没有知识片段，建议先补产品能力、应用场景、FAQ 或选型规则。"
          type="warning"
          show-icon
          :closable="false"
          class="knowledge-empty-alert"
        />

        <section class="knowledge-operation-grid">
          <button
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'chunks')"
          >
            <span>知识片段</span>
            <strong>{{ detail.chunksCount }} 条可引用资料</strong>
            <small>文件和文本会解析为知识片段，可被内容生成引用。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'files')"
          >
            <span>文件资料</span>
            <strong>{{ detail.filesCount }} 个解析文件</strong>
            <small>跟踪文件和手动资料的解析状态、审核状态和来源信息。</small>
          </button>
          <button
            v-if="canManage"
            class="knowledge-operation-card"
            type="button"
            @click="emit('update:activeTab', 'text-import')"
          >
            <span>新增资料</span>
            <strong>上传或粘贴资料</strong>
            <small>补充产品能力、应用场景、FAQ 和选型规则。</small>
          </button>
        </section>

        <section class="knowledge-detail-flow-note">
          <strong>资料层级</strong>
          <span>上传的文件或粘贴的文本会解析为知识片段，知识片段可被内容生成引用。</span>
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
                  <p>默认显示摘要，点击展开可阅读和复制全文。</p>
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
                <div class="knowledge-inner-filter-actions">
                  <el-button type="primary" :loading="chunksLoading" @click="handleChunkSearch">
                    查询片段
                  </el-button>
                  <el-button @click="handleChunkReset">重置</el-button>
                  <el-button text @click="showChunkAdvancedFilters = !showChunkAdvancedFilters">
                    {{ showChunkAdvancedFilters ? "收起高级筛选" : "高级筛选" }}
                  </el-button>
                </div>
              </el-form>

              <el-form
                v-if="showChunkAdvancedFilters"
                class="knowledge-inner-filters knowledge-inner-filters--advanced"
                label-position="top"
              >
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
                <div class="knowledge-filter-note">低频筛选仅用于缩小当前知识片段范围。</div>
              </el-form>

              <KnowledgeChunkTable
                :chunks="chunks"
                :loading="chunksLoading"
                :deleting-ids="deletingChunkIds"
                :can-manage="canManage"
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

          <el-tab-pane label="资料文件" name="files">
            <section class="knowledge-tab-panel">
              <div class="knowledge-tab-header">
                <div>
                  <p class="section-kicker">资料文件</p>
                  <h3>资料列表管理</h3>
                  <p>搜索资料标题、主题、来源说明，判断哪些资料可被售后问答 / GEO 内容正式引用。</p>
                </div>
                <el-radio-group v-model="fileViewMode" size="small" class="knowledge-view-toggle">
                  <el-radio-button label="card">卡片视图</el-radio-button>
                  <el-radio-button label="table">表格视图</el-radio-button>
                </el-radio-group>
              </div>

              <el-form class="knowledge-inner-filters" label-position="top">
                <el-form-item label="搜索资料">
                  <el-input
                    v-model="fileFilters.search"
                    clearable
                    placeholder="搜索资料标题、主题、来源说明"
                    @keyup.enter="handleFileSearch"
                  />
                </el-form-item>
                <el-form-item label="资料类型">
                  <el-select v-model="fileFilters.materialType" clearable placeholder="全部资料">
                    <el-option
                      v-for="option in materialTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="资料主题">
                  <el-select v-model="fileFilters.materialTopic" clearable placeholder="全部主题">
                    <el-option
                      v-for="option in materialTopicOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="审核状态">
                  <el-select v-model="fileFilters.reviewStatus" clearable placeholder="全部状态">
                    <el-option
                      v-for="option in reviewStatusOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="可信度">
                  <el-select v-model="fileFilters.trustLevel" clearable placeholder="全部可信度">
                    <el-option
                      v-for="option in trustLevelOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="适用模块">
                  <el-select v-model="fileFilters.applicableModule" clearable placeholder="全部模块">
                    <el-option
                      v-for="option in applicableModuleOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="正式引用状态">
                  <el-select
                    v-model="fileFilters.officialCitationStatus"
                    clearable
                    placeholder="全部状态"
                  >
                    <el-option
                      v-for="option in officialCitationStatusOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
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
                    <el-option label="xlsx" value="xlsx" />
                    <el-option label="xls" value="xls" />
                    <el-option label="docx" value="docx" />
                    <el-option label="manual" value="manual" />
                  </el-select>
                </el-form-item>
              </el-form>

              <div class="knowledge-actions">
                <el-button type="primary" :loading="filesLoading" @click="handleFileSearch">
                  查询资料
                </el-button>
                <el-button @click="handleFileReset">清空筛选</el-button>
              </div>

              <el-alert
                v-if="!filesLoading && filesTotal === 0 && hasFileFilters"
                title="没有符合条件的资料"
                description="可以清空筛选后重新查看。"
                type="info"
                show-icon
                :closable="false"
                class="knowledge-empty-alert"
              />

              <KnowledgeFileCards
                v-if="fileViewMode === 'card'"
                :files="files"
                :loading="filesLoading"
                :reparsing-ids="reparsingIds"
                :deleting-ids="deletingFileIds"
                :can-manage="canManage"
                :knowledge-base-name="detail.knowledgeBase.name"
                @detail="emit('file-detail', $event)"
                @reparse="emit('reparse-file', $event)"
                @delete="emit('delete-file', $event)"
              />
              <KnowledgeFileTable
                v-else
                :files="files"
                :loading="filesLoading"
                :reparsing-ids="reparsingIds"
                :deleting-ids="deletingFileIds"
                :can-manage="canManage"
                :knowledge-base-name="detail.knowledgeBase.name"
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

          <el-tab-pane v-if="canManage" label="新增资料" name="text-import">
            <section class="knowledge-tab-panel">
              <div class="knowledge-tab-header">
                <div>
                  <p class="section-kicker">新增资料</p>
                  <h3>资料入库向导</h3>
                  <p>先填写标题、资料类型、目录和内容；需要细分主题或调整引用范围时再展开高级资料属性。</p>
                </div>
              </div>
              <KnowledgeMaterialIngestWizard
                :knowledge-base-name="detail.knowledgeBase.name"
                :default-product-line="detail.knowledgeBase.productLine"
                :submitting="textImportSubmitting"
                :uploading="uploading"
                :can-review="canReview"
                :departments="departments"
                @submit="emit('text-import', $event)"
                @upload="emit('upload-file', $event)"
              />
            </section>
          </el-tab-pane>
        </el-tabs>

        <el-collapse class="knowledge-technical-collapse">
          <el-collapse-item title="技术信息（默认折叠）" name="technical">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="知识库 ID">
                {{ detail.knowledgeBase.id }}
              </el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ formatOptional(detail.knowledgeBase.createdBy) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(detail.knowledgeBase.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(detail.knowledgeBase.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>
        </el-collapse>
      </template>
    </section>
  </el-drawer>
</template>

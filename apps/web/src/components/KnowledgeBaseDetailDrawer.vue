<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { Department } from "@/api/departments";
import type {
  KnowledgeApplicableModule,
  KnowledgeBaseDetail,
  KnowledgeChunk,
  KnowledgeChunkQuery,
  KnowledgeDirectory,
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
  parseStatusOptions,
  sourceTypeOptions,
  trustLevelOptions
} from "@/config/knowledge-options";
import KnowledgeChunkTable from "./KnowledgeChunkTable.vue";
import KnowledgeFileCards from "./KnowledgeFileCards.vue";
import KnowledgeFileTable from "./KnowledgeFileTable.vue";
import KnowledgeMaterialIngestWizard from "./KnowledgeMaterialIngestWizard.vue";

type DirectoryTreeNode = KnowledgeDirectory & {
  children: DirectoryTreeNode[];
  level: number;
};

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
  directories?: KnowledgeDirectory[];
  directoriesLoading?: boolean;
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
  "file-edit": [file: KnowledgeFile];
  "reparse-file": [file: KnowledgeFile];
  "delete-file": [file: KnowledgeFile];
  "create-directory": [name: string];
  "rename-directory": [payload: { id: string; name: string }];
  "disable-directory": [directory: KnowledgeDirectory];
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
  directoryId: "",
  fileType: "",
  materialType: "",
  materialTopic: "",
  parseStatus: "" as ParseStatus | "",
  search: "",
  trustLevel: "" as KnowledgeTrustLevel | ""
});
const fileViewMode = ref<"card" | "table">("card");
const fileDisplayMode = ref<"simple" | "management">("simple");
const fileStatusFilter = ref<"all" | "pending" | "approved" | "citable" | "not_citable">("all");
const showFileAdvancedFilters = ref(false);
const ingestInitialMethod = ref<"manual" | "upload">("manual");
const directoryManageVisible = ref(false);
const directoryFormName = ref("");
const editingDirectoryId = ref("");
const directoryFormError = ref("");
const directoryItems = computed(() => props.directories ?? []);
const selectedDirectoryId = ref("");
const expandedDirectoryIds = ref<string[]>([]);
const fileStatusFilterOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "可被 AI 引用", value: "citable" },
  { label: "暂不可引用", value: "not_citable" }
] as const;

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
    fileFilters.directoryId = "";
    fileFilters.materialType = "";
    fileFilters.materialTopic = "";
    fileFilters.parseStatus = "";
    fileFilters.search = "";
    fileFilters.trustLevel = "";
    fileFilters.applicableModule = "";
    fileStatusFilter.value = "all";
    fileDisplayMode.value = "simple";
    fileViewMode.value = "card";
    showFileAdvancedFilters.value = false;
    selectedDirectoryId.value = "";
    expandedDirectoryIds.value = [];
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

const getFileStatusQuery = () => {
  if (fileStatusFilter.value === "pending") {
    return { reviewStatus: "pending" as KnowledgeReviewStatus };
  }
  if (fileStatusFilter.value === "approved") {
    return { reviewStatus: "approved" as KnowledgeReviewStatus };
  }
  if (fileStatusFilter.value === "citable") {
    return { officialCitationStatus: "citable" as KnowledgeOfficialCitationStatus };
  }
  if (fileStatusFilter.value === "not_citable") {
    return { officialCitationStatus: "not_citable" as KnowledgeOfficialCitationStatus };
  }

  return {};
};

const handleFileSearch = () => {
  emit("search-files", {
    applicableModule: fileFilters.applicableModule || undefined,
    directoryId: fileFilters.directoryId || undefined,
    fileType: fileFilters.fileType.trim() || undefined,
    materialType: fileFilters.materialType || undefined,
    materialTopic: fileFilters.materialTopic || undefined,
    ...getFileStatusQuery(),
    parseStatus: fileFilters.parseStatus || undefined,
    search: fileFilters.search.trim() || undefined,
    trustLevel: fileFilters.trustLevel || undefined
  });
};

const handleFileReset = () => {
  fileFilters.applicableModule = "";
  fileFilters.directoryId = "";
  fileFilters.fileType = "";
  fileFilters.materialType = "";
  fileFilters.materialTopic = "";
  fileFilters.parseStatus = "";
  fileFilters.search = "";
  fileFilters.trustLevel = "";
  fileStatusFilter.value = "all";
  showFileAdvancedFilters.value = false;
  selectedDirectoryId.value = "";
  emit("reset-files");
};

const getKnowledgeBaseStatusLabel = (status: string) =>
  knowledgeBaseStatusLabelMap[status] ?? status;

const hasFileFilters = computed(() =>
  Boolean(
      fileFilters.applicableModule ||
      fileFilters.directoryId ||
      fileFilters.fileType ||
      fileFilters.materialType ||
      fileFilters.materialTopic ||
      fileFilters.parseStatus ||
      fileStatusFilter.value !== "all" ||
      fileFilters.search.trim() ||
      fileFilters.trustLevel
  )
);

const advancedFileFilterCount = computed(
  () =>
    [
      fileFilters.applicableModule,
      fileFilters.fileType,
      fileFilters.materialType,
      fileFilters.materialTopic,
      fileFilters.parseStatus,
      fileFilters.trustLevel
    ].filter(Boolean).length
);

const getDirectoryDisplayName = (directory: KnowledgeDirectory) =>
  directory.isDefault ? "默认根目录" : directory.name;

const compareDirectoryOrder = (left: KnowledgeDirectory, right: KnowledgeDirectory) => {
  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return getDirectoryDisplayName(left).localeCompare(getDirectoryDisplayName(right), "zh-Hans-CN");
};

const directoryById = computed(
  () => new Map(directoryItems.value.map((directory) => [directory.id, directory]))
);

const buildDirectoryTree = (
  parentId: string | null,
  level: number,
  visitedIds: Set<string>
): DirectoryTreeNode[] =>
  directoryItems.value
    .filter((directory) => (directory.parentId ?? "") === (parentId ?? ""))
    .sort(compareDirectoryOrder)
    .map((directory) => {
      if (visitedIds.has(directory.id)) {
        return {
          ...directory,
          children: [],
          level
        };
      }

      const nextVisitedIds = new Set(visitedIds);
      nextVisitedIds.add(directory.id);

      return {
        ...directory,
        children: buildDirectoryTree(directory.id, level + 1, nextVisitedIds),
        level
      };
    });

const directoryTreeRoots = computed(() => buildDirectoryTree(null, 0, new Set<string>()));

const visibleDirectoryNodes = computed(() => {
  const nodes: DirectoryTreeNode[] = [];

  const appendNodes = (items: DirectoryTreeNode[]) => {
    for (const directory of items) {
      nodes.push(directory);

      if (directory.children.length > 0 && expandedDirectoryIds.value.includes(directory.id)) {
        appendNodes(directory.children);
      }
    }
  };

  appendNodes(directoryTreeRoots.value);
  return nodes;
});

const selectedDirectory = computed(() =>
  selectedDirectoryId.value ? directoryById.value.get(selectedDirectoryId.value) ?? null : null
);

const currentDirectoryTitle = computed(() =>
  selectedDirectory.value ? getDirectoryDisplayName(selectedDirectory.value) : "全部资料"
);

const getDirectoryPath = (directory: KnowledgeDirectory) => {
  const path: KnowledgeDirectory[] = [];
  let currentDirectory: KnowledgeDirectory | undefined = directory;
  const visitedIds = new Set<string>();

  while (currentDirectory && !visitedIds.has(currentDirectory.id)) {
    path.unshift(currentDirectory);
    visitedIds.add(currentDirectory.id);
    currentDirectory = currentDirectory.parentId
      ? directoryById.value.get(currentDirectory.parentId)
      : undefined;
  }

  return path;
};

const directoryBreadcrumb = computed(() =>
  selectedDirectory.value ? getDirectoryPath(selectedDirectory.value) : []
);

const expandDirectoryPath = (directoryId: string) => {
  const nextExpandedIds = new Set(expandedDirectoryIds.value);
  let currentDirectory = directoryById.value.get(directoryId);
  const visitedIds = new Set<string>();

  while (currentDirectory?.parentId && !visitedIds.has(currentDirectory.id)) {
    visitedIds.add(currentDirectory.id);
    nextExpandedIds.add(currentDirectory.parentId);
    currentDirectory = directoryById.value.get(currentDirectory.parentId);
  }

  expandedDirectoryIds.value = Array.from(nextExpandedIds);
};

const toggleDirectoryNode = (directoryId: string) => {
  expandedDirectoryIds.value = expandedDirectoryIds.value.includes(directoryId)
    ? expandedDirectoryIds.value.filter((id) => id !== directoryId)
    : [...expandedDirectoryIds.value, directoryId];
};

const selectDirectoryNode = (directoryId: string) => {
  selectedDirectoryId.value = directoryId;
  fileFilters.directoryId = directoryId;
  if (directoryId) {
    expandDirectoryPath(directoryId);
  }
  emit("update:activeTab", "files");
  handleFileSearch();
};

watch(
  () => fileFilters.directoryId,
  (directoryId) => {
    selectedDirectoryId.value = directoryId || "";
    if (directoryId) {
      expandDirectoryPath(directoryId);
    }
  }
);

watch(
  directoryItems,
  (directories) => {
    const existingIds = new Set(directories.map((directory) => directory.id));
    const nextExpandedIds = new Set(
      expandedDirectoryIds.value.filter((id) => existingIds.has(id))
    );

    for (const directory of directories) {
      if (!directory.parentId) {
        nextExpandedIds.add(directory.id);
      }
    }

    expandedDirectoryIds.value = Array.from(nextExpandedIds);
  },
  { immediate: true }
);

const openIngestWizard = (method: "manual" | "upload") => {
  ingestInitialMethod.value = method;
  emit("update:activeTab", "text-import");
};

const showPendingKnowledgeFiles = () => {
  fileStatusFilter.value = "pending";
  fileDisplayMode.value = "management";
  emit("update:activeTab", "files");
  handleFileSearch();
};

const getDirectoryStatusLabel = (directory: KnowledgeDirectory) =>
  directory.status === "active" ? "启用" : "已停用";

const resetDirectoryForm = () => {
  directoryFormName.value = "";
  editingDirectoryId.value = "";
  directoryFormError.value = "";
};

const openDirectoryManager = () => {
  resetDirectoryForm();
  directoryManageVisible.value = true;
};

const startCreateDirectory = () => {
  resetDirectoryForm();
};

const startRenameDirectory = (directory: KnowledgeDirectory) => {
  if (directory.isDefault) {
    directoryFormError.value = "默认根目录不能重命名。";
    return;
  }

  editingDirectoryId.value = directory.id;
  directoryFormName.value = directory.name;
  directoryFormError.value = "";
};

const submitDirectoryForm = () => {
  const name = directoryFormName.value.trim();

  if (!name) {
    directoryFormError.value = "请填写目录名称。";
    return;
  }

  if (editingDirectoryId.value) {
    emit("rename-directory", {
      id: editingDirectoryId.value,
      name
    });
  } else {
    emit("create-directory", name);
  }

  resetDirectoryForm();
};
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

        <section class="knowledge-operation-grid knowledge-operation-grid--primary">
          <button
            class="knowledge-operation-card"
            type="button"
            :disabled="!canManage"
            @click="openIngestWizard('upload')"
          >
            <span>上传资料</span>
            <strong>上传文件入库</strong>
            <small>上传 TXT、Markdown、CSV、Excel 或 Word 文件，进入资料库统一管理。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            :disabled="!canManage"
            @click="openIngestWizard('manual')"
          >
            <span>手动录入</span>
            <strong>粘贴整理后的资料</strong>
            <small>适合补充 FAQ、售后经验、产品参数和应用场景。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            @click="showPendingKnowledgeFiles"
          >
            <span>待审核资料</span>
            <strong>筛出待处理资料</strong>
            <small>快速查看反馈草稿和新入库资料，集中做资料状态维护。</small>
          </button>
          <button
            class="knowledge-operation-card"
            type="button"
            :disabled="!canManage"
            @click="openDirectoryManager"
          >
            <span>管理目录</span>
            <strong>维护资料分类</strong>
            <small>新增、重命名或停用目录；已有资料不会被删除。</small>
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
            <div class="knowledge-directory-layout">
              <aside v-loading="directoriesLoading" class="knowledge-directory-sidebar">
                <div class="knowledge-directory-sidebar__header">
                  <div>
                    <p class="section-kicker">资料目录</p>
                    <h3>按目录查看资料</h3>
                  </div>
                  <el-button v-if="canManage" size="small" text @click="openDirectoryManager">
                    管理目录
                  </el-button>
                </div>

                <button
                  type="button"
                  class="knowledge-directory-node knowledge-directory-node--all"
                  :class="{ 'is-selected-directory': selectedDirectoryId === '' }"
                  @click="selectDirectoryNode('')"
                >
                  <span class="knowledge-directory-node__marker">全</span>
                  <span class="knowledge-directory-node__label">全部资料</span>
                </button>

                <div
                  v-if="visibleDirectoryNodes.length > 0"
                  class="knowledge-directory-tree"
                  aria-label="资料目录树"
                >
                  <div
                    v-for="directory in visibleDirectoryNodes"
                    :key="directory.id"
                    class="knowledge-directory-node"
                    :class="{
                      'is-selected-directory': selectedDirectoryId === directory.id,
                      'is-disabled-directory': directory.status === 'disabled'
                    }"
                    :style="{ paddingLeft: `${12 + directory.level * 18}px` }"
                    role="button"
                    tabindex="0"
                    @click="selectDirectoryNode(directory.id)"
                    @keydown.enter.prevent="selectDirectoryNode(directory.id)"
                    @keydown.space.prevent="selectDirectoryNode(directory.id)"
                  >
                    <button
                      v-if="directory.children.length > 0"
                      type="button"
                      class="knowledge-directory-node__toggle"
                      :aria-expanded="expandedDirectoryIds.includes(directory.id)"
                      @click.stop="toggleDirectoryNode(directory.id)"
                    >
                      {{ expandedDirectoryIds.includes(directory.id) ? "▾" : "▸" }}
                    </button>
                    <span v-else class="knowledge-directory-node__toggle-placeholder" />
                    <span class="knowledge-directory-node__label">
                      {{ getDirectoryDisplayName(directory) }}
                    </span>
                    <el-tag
                      v-if="directory.isDefault"
                      size="small"
                      type="success"
                      effect="plain"
                    >
                      默认
                    </el-tag>
                    <el-tag
                      v-if="directory.status === 'disabled'"
                      size="small"
                      type="info"
                      effect="plain"
                    >
                      已停用
                    </el-tag>
                  </div>
                </div>
                <el-empty v-else description="暂无目录，可先使用默认根目录。" :image-size="72" />
              </aside>

              <section class="knowledge-tab-panel knowledge-file-workspace">
                <div class="knowledge-tab-header">
                  <div>
                    <p class="section-kicker">资料文件</p>
                    <h3>资料列表管理</h3>
                    <p>搜索资料标题、目录和资料状态，快速判断哪些资料可被售后问答 / GEO 内容引用。</p>
                  </div>
                  <div class="knowledge-file-toolbar">
                    <el-button v-if="canManage" type="primary" plain @click="openDirectoryManager">
                      管理目录
                    </el-button>
                    <el-radio-group
                      v-model="fileDisplayMode"
                      size="small"
                      class="knowledge-view-toggle"
                    >
                      <el-radio-button label="simple">简洁视图</el-radio-button>
                      <el-radio-button label="management">管理视图</el-radio-button>
                    </el-radio-group>
                    <el-radio-group v-model="fileViewMode" size="small" class="knowledge-view-toggle">
                      <el-radio-button label="card">卡片视图</el-radio-button>
                      <el-radio-button label="table">表格视图</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>

                <section class="knowledge-current-directory">
                  <div class="knowledge-current-directory__main">
                    <p class="section-kicker">当前目录</p>
                    <div class="knowledge-current-directory__title">
                      <h3>{{ currentDirectoryTitle }}</h3>
                      <el-tag
                        v-if="selectedDirectory?.isDefault"
                        size="small"
                        type="success"
                        effect="plain"
                      >
                        默认根目录
                      </el-tag>
                      <el-tag
                        v-if="selectedDirectory?.status === 'disabled'"
                        size="small"
                        type="info"
                        effect="plain"
                      >
                        已停用
                      </el-tag>
                    </div>
                    <p>
                      {{
                        selectedDirectory
                          ? "当前仅显示这个目录下的资料；停用目录下的已有资料仍可查看。"
                          : "显示当前知识库内全部目录的资料。"
                      }}
                    </p>
                  </div>
                  <div class="knowledge-directory-breadcrumb" aria-label="目录路径">
                    <span>目录路径</span>
                    <el-breadcrumb separator="/">
                      <el-breadcrumb-item v-if="!selectedDirectory">全部资料</el-breadcrumb-item>
                      <template v-else>
                        <el-breadcrumb-item
                          v-for="directory in directoryBreadcrumb"
                          :key="directory.id"
                        >
                          {{ getDirectoryDisplayName(directory) }}
                        </el-breadcrumb-item>
                      </template>
                    </el-breadcrumb>
                  </div>
                </section>

                <el-form class="knowledge-inner-filters knowledge-inner-filters--basic" label-position="top">
                  <el-form-item label="搜索资料">
                    <el-input
                      v-model="fileFilters.search"
                      clearable
                      placeholder="搜索资料标题、主题、来源说明"
                      @keyup.enter="handleFileSearch"
                    />
                  </el-form-item>
                  <el-form-item label="所属目录">
                    <el-select
                      v-model="fileFilters.directoryId"
                      clearable
                      filterable
                      placeholder="全部目录"
                      :loading="directoriesLoading"
                    >
                      <el-option
                        v-for="directory in directoryItems"
                        :key="directory.id"
                        :label="
                          directory.status === 'disabled'
                            ? `${getDirectoryDisplayName(directory)}（已停用）`
                            : getDirectoryDisplayName(directory)
                        "
                        :value="directory.id"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="状态">
                    <el-select v-model="fileStatusFilter" placeholder="全部">
                      <el-option
                        v-for="option in fileStatusFilterOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </el-form-item>
                  <div class="knowledge-inner-filter-actions">
                    <el-button type="primary" :loading="filesLoading" @click="handleFileSearch">
                      查询资料
                    </el-button>
                    <el-button @click="handleFileReset">清空筛选</el-button>
                    <el-button text @click="showFileAdvancedFilters = !showFileAdvancedFilters">
                      {{ showFileAdvancedFilters ? "收起高级筛选" : "高级筛选" }}
                    </el-button>
                    <el-tag v-if="advancedFileFilterCount > 0" type="warning" effect="plain">
                      已启用 {{ advancedFileFilterCount }} 个高级筛选
                    </el-tag>
                  </div>
                </el-form>

                <el-form
                  v-if="showFileAdvancedFilters"
                  class="knowledge-inner-filters knowledge-inner-filters--advanced"
                  label-position="top"
                >
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
                  <el-form-item label="可靠程度">
                    <el-select v-model="fileFilters.trustLevel" clearable placeholder="全部可靠程度">
                      <el-option
                        v-for="option in trustLevelOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="可用场景">
                    <el-select v-model="fileFilters.applicableModule" clearable placeholder="全部场景">
                      <el-option
                        v-for="option in applicableModuleOptions"
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
                  :display-mode="fileDisplayMode"
                  @detail="emit('file-detail', $event)"
                  @edit="emit('file-edit', $event)"
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
                  :display-mode="fileDisplayMode"
                  @detail="emit('file-detail', $event)"
                  @edit="emit('file-edit', $event)"
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
            </div>
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
                :directories="directories"
                :initial-method="ingestInitialMethod"
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

        <el-dialog
          v-model="directoryManageVisible"
          title="目录管理"
          width="640px"
          append-to-body
        >
          <section v-loading="directoriesLoading" class="knowledge-directory-manager">
            <el-alert
              v-if="directoryFormError"
              :title="directoryFormError"
              type="error"
              show-icon
              :closable="false"
            />
            <el-alert
              v-if="directoryItems.filter((directory) => !directory.isDefault).length === 0"
              title="当前没有自定义目录，可以先使用默认根目录。"
              type="info"
              show-icon
              :closable="false"
            />
            <div class="knowledge-directory-form">
              <el-input
                v-model="directoryFormName"
                maxlength="40"
                show-word-limit
                placeholder="目录名称，例如 FAQ、客户案例、售后资料"
                @keyup.enter="submitDirectoryForm"
              />
              <el-button type="primary" @click="submitDirectoryForm">
                {{ editingDirectoryId ? "保存名称" : "新增目录" }}
              </el-button>
              <el-button v-if="editingDirectoryId" @click="startCreateDirectory">
                取消编辑
              </el-button>
            </div>
            <el-table
              :data="directoryItems"
              row-key="id"
              border
              empty-text="暂无目录，系统会提供默认根目录。"
            >
              <el-table-column prop="name" label="目录名称" min-width="180">
                <template #default="{ row }: { row: KnowledgeDirectory }">
                  <strong>{{ getDirectoryDisplayName(row) }}</strong>
                  <el-tag v-if="row.isDefault" size="small" type="success" effect="plain">
                    默认根目录
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }: { row: KnowledgeDirectory }">
                  <el-tag
                    :type="row.status === 'active' ? 'success' : 'info'"
                    effect="plain"
                  >
                    {{ getDirectoryStatusLabel(row) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="176">
                <template #default="{ row }: { row: KnowledgeDirectory }">
                  <el-button
                    link
                    type="primary"
                    :disabled="row.isDefault || row.status !== 'active'"
                    @click="startRenameDirectory(row)"
                  >
                    重命名
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :disabled="row.isDefault || row.status !== 'active'"
                    @click="emit('disable-directory', row)"
                  >
                    停用
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <p class="knowledge-directory-note">
              停用后不再用于新资料归类，已有资料仍可查看。
            </p>
          </section>
        </el-dialog>
      </template>
    </section>
  </el-drawer>
</template>

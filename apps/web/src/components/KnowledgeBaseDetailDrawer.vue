<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { ElDrawer, ElMessage } from "element-plus";
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

type CreateDirectoryRequest = {
  name: string;
  parentId?: string;
  selectAfterCreate?: boolean;
  onCreated?: (directory: KnowledgeDirectory) => void;
  onFinished?: () => void;
};

const MAX_DIRECTORY_DEPTH = 4;

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
  embedded?: boolean;
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
  "create-directory": [payload: CreateDirectoryRequest];
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
const ingestContextVersion = ref(0);
const directoryManageVisible = ref(false);
const directoryFormName = ref("");
const editingDirectoryId = ref("");
const directoryFormError = ref("");
const quickChildDirectoryVisible = ref(false);
const quickChildDirectoryName = ref("");
const quickChildDirectoryError = ref("");
const quickChildDirectorySubmitting = ref(false);
const isMobileCatalogDrawerOpen = ref(false);
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
const isEmbedded = computed(() => props.embedded === true);
const detailShellComponent = computed(() => (isEmbedded.value ? "section" : ElDrawer));
const detailShellProps = computed(() =>
  isEmbedded.value
    ? {
        class: "knowledge-detail-shell knowledge-detail-shell--embedded"
      }
    : {
        class: "knowledge-detail-drawer",
        modelValue: props.modelValue,
        size: "82%",
        withHeader: false
      }
);

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
    isMobileCatalogDrawerOpen.value = false;
  }
);

const close = () => {
  if (isEmbedded.value) {
    return;
  }

  emit("update:modelValue", false);
};

const handleShellModelUpdate = (value: boolean) => {
  if (!isEmbedded.value) {
    emit("update:modelValue", value);
  }
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
      fileFilters.directoryId,
      fileFilters.fileType,
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

const getDirectoryPathLabel = (directory: KnowledgeDirectory | null | undefined) =>
  directory ? getDirectoryPath(directory).map(getDirectoryDisplayName).join(" / ") : "默认根目录";

const selectedDirectoryPathLabel = computed(() =>
  selectedDirectory.value ? getDirectoryPathLabel(selectedDirectory.value) : "全部资料"
);

const selectedDirectoryDepth = computed(() => directoryBreadcrumb.value.length);

const ingestDefaultDirectory = computed(() =>
  selectedDirectory.value?.status === "active" ? selectedDirectory.value : null
);

const ingestInitialDirectoryId = computed(() => ingestDefaultDirectory.value?.id ?? "");
const ingestInitialDirectoryPath = computed(() =>
  ingestDefaultDirectory.value ? getDirectoryPathLabel(ingestDefaultDirectory.value) : "默认根目录"
);
const ingestInitialDirectoryWarning = computed(() =>
  selectedDirectory.value?.status === "disabled" ? "当前目录已停用，请选择其他目录" : ""
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

const openMobileCatalogDrawer = () => {
  isMobileCatalogDrawerOpen.value = true;
};

const selectDirectoryNodeFromDrawer = (directoryId: string) => {
  selectDirectoryNode(directoryId);
  isMobileCatalogDrawerOpen.value = false;
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
  ingestContextVersion.value += 1;
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

const resetQuickChildDirectoryForm = () => {
  quickChildDirectoryName.value = "";
  quickChildDirectoryError.value = "";
};

const openQuickChildDirectory = () => {
  if (!props.canManage) {
    return;
  }

  if (!selectedDirectory.value) {
    ElMessage.warning("请先选择一个目录。");
    return;
  }

  if (selectedDirectory.value.status === "disabled") {
    ElMessage.warning("当前目录已停用，请选择其他目录。");
    return;
  }

  if (selectedDirectoryDepth.value >= MAX_DIRECTORY_DEPTH) {
    ElMessage.warning("最多支持 4 层目录。");
    return;
  }

  resetQuickChildDirectoryForm();
  quickChildDirectoryVisible.value = true;
};

const submitQuickChildDirectory = () => {
  const parentDirectory = selectedDirectory.value;
  const name = quickChildDirectoryName.value.trim();

  quickChildDirectoryError.value = "";

  if (!parentDirectory) {
    quickChildDirectoryError.value = "请先选择一个目录。";
    return;
  }

  if (parentDirectory.status === "disabled") {
    quickChildDirectoryError.value = "当前目录已停用，请选择其他目录。";
    return;
  }

  if (selectedDirectoryDepth.value >= MAX_DIRECTORY_DEPTH) {
    quickChildDirectoryError.value = "最多支持 4 层目录。";
    return;
  }

  if (!name) {
    quickChildDirectoryError.value = "请填写子目录名称。";
    return;
  }

  quickChildDirectorySubmitting.value = true;
  const parentId = parentDirectory.id;

  emit("create-directory", {
    name,
    onCreated: (directory) => {
      quickChildDirectoryVisible.value = false;
      resetQuickChildDirectoryForm();
      expandedDirectoryIds.value = Array.from(new Set([...expandedDirectoryIds.value, parentId]));

      if (directory.id) {
        void nextTick(() => selectDirectoryNode(directory.id));
      }
    },
    onFinished: () => {
      quickChildDirectorySubmitting.value = false;
    },
    parentId,
    selectAfterCreate: true
  });
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
    emit("create-directory", { name });
  }

  resetDirectoryForm();
};
</script>

<template>
  <component
    :is="detailShellComponent"
    v-bind="detailShellProps"
    @close="close"
    @update:model-value="handleShellModelUpdate"
  >
    <section class="knowledge-detail" :class="{ 'knowledge-detail--embedded': isEmbedded }">
      <div v-if="!isEmbedded" class="knowledge-detail-header">
        <div class="knowledge-detail-header__copy">
          <el-tag class="knowledge-detail-header__tag" type="success" effect="plain">
            企业 GEO 知识库
          </el-tag>
          <h2>{{ detail?.knowledgeBase.name ?? "企业 GEO 知识库详情" }}</h2>
          <p>
            管理企业资料和 AI 可引用内容。
          </p>
        </div>
        <div class="knowledge-detail-actions">
          <el-button :loading="detailLoading" @click="emit('refresh')">刷新详情</el-button>
          <el-button v-if="!isEmbedded" @click="close">关闭</el-button>
        </div>
      </div>

      <el-skeleton v-if="detailLoading && !detail" :rows="6" animated />

      <template v-else-if="detail">
        <section v-if="!isEmbedded" class="knowledge-readable-section">
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
          v-if="!isEmbedded && detail.chunksCount === 0"
          title="暂无知识片段，可先上传资料或手动录入。"
          type="warning"
          show-icon
          :closable="false"
          class="knowledge-empty-alert"
        />

        <section v-if="!isEmbedded" class="knowledge-detail-flow-note">
          <strong>资料层级</strong>
          <span>资料会解析为知识片段，用于后续 GEO 内容引用。</span>
        </section>

        <el-tabs
          :model-value="activeTab === 'text-import' ? 'files' : activeTab"
          class="knowledge-section-tabs kb-tabs"
          @tab-change="emit('update:activeTab', $event as 'chunks' | 'files')"
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

          <el-tab-pane label="资料" name="files">
            <div class="knowledge-directory-layout kb-split-layout">
              <aside v-loading="directoriesLoading" class="knowledge-directory-sidebar kb-sidebar">
                <div class="knowledge-directory-sidebar__header">
                  <div>
                    <p class="section-kicker">目录</p>
                    <h3>资料导航</h3>
                    <span class="kb-sidebar__current">当前：{{ currentDirectoryTitle }}</span>
                  </div>
                  <div class="knowledge-directory-sidebar__actions">
                    <el-button v-if="canManage" size="small" text @click="openDirectoryManager">
                      管理目录
                    </el-button>
                  </div>
                </div>

                <button
                  type="button"
                  class="knowledge-directory-node knowledge-directory-node--all"
                  :class="{ 'is-selected-directory': selectedDirectoryId === '' }"
                  @click="selectDirectoryNode('')"
                >
                  <span class="knowledge-directory-node__marker">▾</span>
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

              <el-drawer
                v-model="isMobileCatalogDrawerOpen"
                append-to-body
                class="kb-mobile-directory-drawer"
                direction="ltr"
                size="min(86vw, 320px)"
                title="目录"
              >
                <section v-loading="directoriesLoading" class="kb-mobile-directory-panel">
                  <div class="knowledge-directory-sidebar__header">
                    <div>
                      <p class="section-kicker">目录</p>
                      <h3>资料导航</h3>
                      <span class="kb-sidebar__current">当前：{{ currentDirectoryTitle }}</span>
                    </div>
                    <div class="knowledge-directory-sidebar__actions">
                      <el-button v-if="canManage" size="small" text @click="openDirectoryManager">
                        管理目录
                      </el-button>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="knowledge-directory-node knowledge-directory-node--all"
                    :class="{ 'is-selected-directory': selectedDirectoryId === '' }"
                    @click="selectDirectoryNodeFromDrawer('')"
                  >
                    <span class="knowledge-directory-node__marker">▾</span>
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
                      @click="selectDirectoryNodeFromDrawer(directory.id)"
                      @keydown.enter.prevent="selectDirectoryNodeFromDrawer(directory.id)"
                      @keydown.space.prevent="selectDirectoryNodeFromDrawer(directory.id)"
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
                </section>
              </el-drawer>

              <section class="knowledge-tab-panel knowledge-file-workspace kb-main">
                <div class="knowledge-tab-header kb-main-toolbar">
                  <div class="kb-main-toolbar__title">
                    <p class="section-kicker">当前目录</p>
                    <h3>{{ currentDirectoryTitle }}</h3>
                    <div class="kb-mobile-directory-entry" aria-label="移动端目录入口">
                      <el-button size="small" @click="openMobileCatalogDrawer">
                        ☰ 目录
                      </el-button>
                      <span>当前：{{ currentDirectoryTitle }}</span>
                    </div>
                  </div>
                  <div class="knowledge-file-toolbar kb-main-toolbar__actions">
                    <div class="knowledge-primary-actions">
                      <el-button
                        v-if="canManage"
                        type="primary"
                        @click="openIngestWizard('upload')"
                      >
                        + 上传资料
                      </el-button>
                      <el-button
                        v-if="canManage"
                        type="primary"
                        plain
                        @click="openIngestWizard('manual')"
                      >
                        手动录入
                      </el-button>
                      <el-button
                        v-if="canManage"
                        type="primary"
                        plain
                        @click="openQuickChildDirectory"
                      >
                        新建子目录
                      </el-button>
                    </div>
                    <el-button @click="showPendingKnowledgeFiles">待审核资料</el-button>
                    <el-button v-if="canManage" plain @click="openDirectoryManager">
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

                <section class="knowledge-current-directory kb-directory-context">
                  <div class="knowledge-current-directory__main">
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
                    <p>{{ selectedDirectory ? "只看当前目录资料。" : "显示全部目录资料。" }}</p>
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

                <section v-if="canManage && activeTab === 'text-import'" class="knowledge-ingest-inline-panel">
                  <div class="knowledge-ingest-inline-panel__header">
                    <div>
                      <p class="section-kicker">资料入库</p>
                      <h3>资料入库向导</h3>
                    </div>
                    <el-button text @click="emit('update:activeTab', 'files')">返回资料</el-button>
                  </div>
                  <KnowledgeMaterialIngestWizard
                    :knowledge-base-name="detail.knowledgeBase.name"
                    :default-product-line="detail.knowledgeBase.productLine"
                    :submitting="textImportSubmitting"
                    :uploading="uploading"
                    :can-review="canReview"
                    :departments="departments"
                    :directories="directories"
                    :initial-directory-id="ingestInitialDirectoryId"
                    :initial-directory-path="ingestInitialDirectoryPath"
                    :initial-directory-warning="ingestInitialDirectoryWarning"
                    :initial-method="ingestInitialMethod"
                    :context-version="ingestContextVersion"
                    @submit="emit('text-import', $event)"
                    @upload="emit('upload-file', $event)"
                  />
                </section>

                <el-form class="knowledge-inner-filters knowledge-inner-filters--basic kb-main-filterbar" label-position="top">
                  <el-form-item label="搜索资料">
                    <el-input
                      v-model="fileFilters.search"
                      clearable
                      placeholder="搜索资料标题、主题、来源说明"
                      @keyup.enter="handleFileSearch"
                    />
                  </el-form-item>
                  <el-form-item label="资料状态">
                    <el-select v-model="fileStatusFilter" placeholder="全部">
                      <el-option
                        v-for="option in fileStatusFilterOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
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
                  <div class="knowledge-inner-filter-actions">
                    <el-button type="primary" :loading="filesLoading" @click="handleFileSearch">
                      查询资料
                    </el-button>
                    <el-button @click="handleFileReset">清空筛选</el-button>
                    <el-button text @click="showFileAdvancedFilters = !showFileAdvancedFilters">
                      {{ showFileAdvancedFilters ? "收起更多筛选" : "更多筛选" }}
                    </el-button>
                    <el-tag v-if="advancedFileFilterCount > 0" type="warning" effect="plain">
                      已启用 {{ advancedFileFilterCount }} 个筛选
                    </el-tag>
                  </div>
                </el-form>

                <el-form
                  v-if="showFileAdvancedFilters"
                  class="knowledge-inner-filters knowledge-inner-filters--advanced"
                  label-position="top"
                >
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

        <el-dialog
          v-model="quickChildDirectoryVisible"
          title="新建子目录"
          width="440px"
          append-to-body
          @closed="resetQuickChildDirectoryForm"
        >
          <section class="knowledge-quick-directory-form">
            <el-alert
              v-if="quickChildDirectoryError"
              :title="quickChildDirectoryError"
              type="error"
              show-icon
              :closable="false"
            />
            <p>
              <span>父级目录</span>
              <strong>{{ selectedDirectoryPathLabel }}</strong>
            </p>
            <el-input
              v-model="quickChildDirectoryName"
              maxlength="40"
              show-word-limit
              placeholder="子目录名称，例如 产品大类、型号组、资料组"
              @keyup.enter="submitQuickChildDirectory"
            />
            <small>最多支持 4 层目录；新建后会自动选中新目录。</small>
          </section>
          <template #footer>
            <el-button @click="quickChildDirectoryVisible = false">取消</el-button>
            <el-button
              type="primary"
              :loading="quickChildDirectorySubmitting"
              @click="submitQuickChildDirectory"
            >
              新建子目录
            </el-button>
          </template>
        </el-dialog>
      </template>
    </section>
  </component>
</template>

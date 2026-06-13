<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  createManualKnowledgeMaterial,
  createKnowledgeDirectory,
  createKnowledgeBase,
  disableKnowledgeDirectory,
  deleteKnowledgeBase,
  deleteKnowledgeChunk,
  deleteKnowledgeFile,
  getKnowledgeDirectories,
  getKnowledgeBase,
  getKnowledgeBases,
  getKnowledgeChunks,
  getKnowledgeFile,
  getKnowledgeFiles,
  reparseKnowledgeFile,
  updateKnowledgeDirectory,
  updateKnowledgeBase,
  updateKnowledgeChunk,
  updateKnowledgeFileMetadata,
  uploadKnowledgeFile,
  type KnowledgeApplicableModule,
  type CreateKnowledgeBasePayload,
  type KnowledgeBase,
  type KnowledgeBaseDetail,
  type KnowledgeBaseQuery,
  type KnowledgeChunk,
  type KnowledgeChunkQuery,
  type KnowledgeDirectory,
  type KnowledgeFile,
  type KnowledgeFileQuery,
  type KnowledgeMaterialMetadataPayload,
  type KnowledgeMaterialType,
  type KnowledgeReviewStatus,
  type KnowledgeTrustLevel,
  type ManualKnowledgeMaterialPayload,
  type UpdateKnowledgeBasePayload,
  type UpdateKnowledgeChunkPayload,
  type UploadKnowledgeFileExtraFields
} from "@/api/knowledge";
import { listDepartments, type Department } from "@/api/departments";
import AppErrorState from "@/components/AppErrorState.vue";
import KnowledgeBaseDetailDrawer from "@/components/KnowledgeBaseDetailDrawer.vue";
import KnowledgeBaseFilters from "@/components/KnowledgeBaseFilters.vue";
import KnowledgeBaseFormDialog from "@/components/KnowledgeBaseFormDialog.vue";
import KnowledgeChunkFormDialog from "@/components/KnowledgeChunkFormDialog.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  applicableModuleOptions,
  applicableModuleLabelMap,
  inferEvidenceType,
  knowledgeBaseStatusLabelMap,
  materialTopicOptions,
  materialTopicLabelMap,
  materialTypeOptions,
  materialTypeLabelMap,
  parseStatusLabelMap,
  reviewStatusOptions,
  reviewStatusLabelMap,
  trustLevelOptions,
  trustLevelLabelMap
} from "@/config/knowledge-options";
import { useAuthStore } from "@/stores/auth";
import {
  getKnowledgeFileCitationDescription,
  getKnowledgeFileCitationLabel,
  isKnowledgeFileOfficiallyCitable
} from "@/utils/knowledge-citation";
import { formatKnowledgeSourceDescription } from "@/utils/knowledge-source";
import { canUseAction } from "@/utils/permission";

const authStore = useAuthStore();
const route = useRoute();
const knowledgeBases = ref<KnowledgeBase[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const tableError = ref("");
const lastLoadedAt = ref("");

const filters = reactive<KnowledgeBaseQuery>({
  page: 1,
  pageSize: 10
});

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingKnowledgeBase = ref<KnowledgeBase | null>(null);
const formSubmitting = ref(false);
const formError = ref("");

const knowledgeManagerVisible = ref(false);
const activeTab = ref<"chunks" | "files" | "text-import">("files");
const selectedKnowledgeBaseId = ref("");
const detail = ref<KnowledgeBaseDetail | null>(null);
const detailLoading = ref(false);

const chunks = ref<KnowledgeChunk[]>([]);
const chunksTotal = ref(0);
const chunksPage = ref(1);
const chunksPageSize = ref(10);
const chunksLoading = ref(false);
const chunkFilters = reactive<KnowledgeChunkQuery>({});

const files = ref<KnowledgeFile[]>([]);
const filesTotal = ref(0);
const filesPage = ref(1);
const filesPageSize = ref(10);
const filesLoading = ref(false);
const fileFilters = reactive<KnowledgeFileQuery>({});
const directories = ref<KnowledgeDirectory[]>([]);
const directoriesLoading = ref(false);
const departments = ref<Department[]>([]);
const departmentsLoading = ref(false);

const textImportSubmitting = ref(false);
const uploading = ref(false);
const reparsingIds = ref<string[]>([]);
const deletingFileIds = ref<string[]>([]);
const deletingChunkIds = ref<string[]>([]);

const chunkDialogVisible = ref(false);
const editingChunk = ref<KnowledgeChunk | null>(null);
const chunkFormSubmitting = ref(false);
const chunkFormError = ref("");
const fileEditDialogVisible = ref(false);
const editingFile = ref<KnowledgeFile | null>(null);
const fileEditSubmitting = ref(false);
const fileEditLoading = ref(false);
const fileEditError = ref("");
const fileEditForm = reactive<{
  title: string;
  materialType: KnowledgeMaterialType;
  materialTopic: string;
  reviewStatus: KnowledgeReviewStatus;
  trustLevel: KnowledgeTrustLevel;
  applicableModules: KnowledgeApplicableModule[];
  directoryId: string;
  sourceDescription: string;
  content: string;
}>({
  title: "",
  materialType: "content_reference_material",
  materialTopic: "",
  reviewStatus: "pending",
  trustLevel: "medium",
  applicableModules: [],
  directoryId: "",
  sourceDescription: "",
  content: ""
});

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && knowledgeBases.value.length === 0);
const selectedKnowledgeBase = computed(
  () =>
    detail.value?.knowledgeBase ??
    knowledgeBases.value.find((item) => item.id === selectedKnowledgeBaseId.value) ??
    null
);
const knowledgeBaseOptions = computed(() =>
  knowledgeBases.value
    .filter((item) => item.status === "active" || item.status === "enabled")
    .concat(
      knowledgeBases.value.filter(
        (item) => item.status !== "active" && item.status !== "enabled"
      )
    )
);
const canEditFileContent = computed(() => editingFile.value?.sourceType === "manual");
const activeDirectoryOptions = computed(() =>
  directories.value.filter((directory) => directory.status === "active")
);
const fileEditCitationPreview = computed(() => {
  const previewFile = {
    ...(editingFile.value ?? {}),
    reviewStatus: fileEditForm.reviewStatus,
    trustLevel: fileEditForm.trustLevel,
    applicableModules: fileEditForm.applicableModules,
    deletedAt: null
  } as KnowledgeFile & { deletedAt: null };
  const reasons: string[] = [];

  if (fileEditForm.reviewStatus === "pending") {
    reasons.push("未审核");
  } else if (fileEditForm.reviewStatus === "disabled") {
    reasons.push("已停用");
  }
  if (fileEditForm.trustLevel === "low") {
    reasons.push("低可靠");
  }
  if (fileEditForm.applicableModules.length === 0) {
    reasons.push("不适用当前模块");
  }

  return {
    label: isKnowledgeFileOfficiallyCitable(previewFile) ? "可被 AI 引用" : "暂不可引用",
    reasons:
      reasons.length > 0
        ? reasons.join("、")
        : "已通过且可靠程度为高 / 中；AI 可引用状态由系统规则自动推导。"
  };
});
const knowledgeAssetMetrics = computed(() => {
  const activeCount = knowledgeBases.value.filter(
    (item) => item.status === "active" || item.status === "enabled"
  ).length;
  const missingDescriptionCount = knowledgeBases.value.filter(
    (item) => !item.description?.trim()
  ).length;
  const statusReviewCount = knowledgeBases.value.filter(
    (item) => item.status !== "active" && item.status !== "enabled"
  ).length;

  return [
    {
      label: "当前列表知识库",
      value: total.value,
      note: "当前筛选结果"
    },
    {
      label: "当前列表启用",
      value: activeCount,
      note: "本页可引用资料库"
    },
    {
      label: "待补说明",
      value: missingDescriptionCount,
      note: "缺少说明或事实摘要"
    },
    {
      label: "待检查状态",
      value: statusReviewCount,
      note: "需确认是否可继续引用"
    }
  ];
});

const workspaceSummaryItems = computed(() => [
  {
    label: "资料",
    value: detail.value?.filesCount ?? 0,
    suffix: "条"
  },
  {
    label: "知识片段",
    value: detail.value?.chunksCount ?? 0,
    suffix: "条"
  },
  {
    label: "目录",
    value: directories.value.length,
    suffix: "个"
  },
  {
    label: "更新",
    value: detail.value?.knowledgeBase.updatedAt
      ? formatDateTime(detail.value.knowledgeBase.updatedAt)
      : "未同步"
  }
]);

const visibilityLabelMap = {
  COMPANY: "公司公共",
  PLATFORM: "平台公共",
  PRIVATE: "我的"
} as const;

const visibilityTagTypeMap = {
  COMPANY: "success",
  PLATFORM: "warning",
  PRIVATE: "info"
} as const;

const isOperatorRole = () =>
  ["operator", "geo_operator", "content_editor"].includes(String(authStore.currentRole ?? ""));
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canCreateKnowledgeBase = computed(() => canUseAction("create", currentRole.value));
const canReviewMaterials = computed(() =>
  ["platform_admin", "company_admin"].includes(String(currentRole.value ?? ""))
);

const canManageKnowledgeBase = (knowledgeBase?: KnowledgeBase | null) => {
  if (!knowledgeBase || knowledgeBase.visibility === "PLATFORM") {
    return false;
  }

  if (isOperatorRole()) {
    return (
      knowledgeBase.visibility === "PRIVATE" &&
      knowledgeBase.createdBy === authStore.currentUser?.id
    );
  }

  return authStore.currentRole !== "viewer";
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.message}。后端未连接时页面仍可访问，请先确认 API 服务是否启动。`;
  }

  return "请求失败。后端未连接时页面仍可访问，请先确认 API 服务是否启动。";
};

const trimOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const formatKnowledgeDescription = (value?: string) => {
  const description = value?.trim();

  if (!description) {
    return "暂无说明，建议补充产品能力、应用场景或 FAQ。";
  }

  return description.length > 72 ? `${description.slice(0, 72)}...` : description;
};

const buildKnowledgeBaseQuery = (): KnowledgeBaseQuery => ({
  createdBy: trimOptional(filters.createdBy),
  page: page.value,
  pageSize: pageSize.value,
  productLine: trimOptional(filters.productLine),
  search: trimOptional(filters.search),
  status: trimOptional(filters.status)
});

const clearWorkspaceKnowledgeBase = () => {
  selectedKnowledgeBaseId.value = "";
  detail.value = null;
  directories.value = [];
  chunks.value = [];
  chunksTotal.value = 0;
  files.value = [];
  filesTotal.value = 0;
};

const resetResourcePaginationAndFilters = () => {
  chunksPage.value = 1;
  filesPage.value = 1;
  Object.assign(chunkFilters, {
    materialType: undefined,
    productLine: undefined,
    search: undefined,
    sourceType: undefined,
    tags: undefined
  });
  Object.assign(fileFilters, {
    applicableModule: undefined,
    directoryId: undefined,
    fileType: undefined,
    materialType: undefined,
    materialTopic: undefined,
    officialCitationStatus: undefined,
    parseStatus: undefined,
    reviewStatus: undefined,
    search: undefined,
    trustLevel: undefined
  });
};

const loadKnowledgeBases = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await getKnowledgeBases(buildKnowledgeBaseQuery());
    knowledgeBases.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
    lastLoadedAt.value = new Date().toLocaleString();
    await ensureWorkspaceKnowledgeBase(result.items);
  } catch (error) {
    tableError.value = getErrorMessage(error);
    knowledgeBases.value = [];
    total.value = 0;
    clearWorkspaceKnowledgeBase();
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  void loadKnowledgeBases();
};

const handleReset = () => {
  Object.assign(filters, {
    createdBy: undefined,
    page: 1,
    pageSize: pageSize.value,
    productLine: undefined,
    search: undefined,
    status: undefined
  });
  page.value = 1;
  void loadKnowledgeBases();
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadKnowledgeBases();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadKnowledgeBases();
};

const openCreateDialog = () => {
  if (!canCreateKnowledgeBase.value) {
    ElMessage.warning("当前账号无权新建知识库。");
    return;
  }

  formMode.value = "create";
  editingKnowledgeBase.value = null;
  formError.value = "";
  formVisible.value = true;
};

const openEditDialog = (knowledgeBase: KnowledgeBase) => {
  formMode.value = "edit";
  editingKnowledgeBase.value = knowledgeBase;
  formError.value = "";
  formVisible.value = true;
};

const loadDetail = async () => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  detailLoading.value = true;

  try {
    detail.value = await getKnowledgeBase(selectedKnowledgeBaseId.value);
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
};

const buildChunkQuery = (): KnowledgeChunkQuery => ({
  ...chunkFilters,
  page: chunksPage.value,
  pageSize: chunksPageSize.value
});

const loadChunks = async () => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  chunksLoading.value = true;

  try {
    const result = await getKnowledgeChunks(selectedKnowledgeBaseId.value, buildChunkQuery());
    chunks.value = result.items;
    chunksTotal.value = result.total;
    chunksPage.value = result.page;
    chunksPageSize.value = result.pageSize;
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    chunks.value = [];
    chunksTotal.value = 0;
  } finally {
    chunksLoading.value = false;
  }
};

const buildFileQuery = (): KnowledgeFileQuery => ({
  ...fileFilters,
  page: filesPage.value,
  pageSize: filesPageSize.value
});

const loadFiles = async () => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  filesLoading.value = true;

  try {
    const result = await getKnowledgeFiles(selectedKnowledgeBaseId.value, buildFileQuery());
    files.value = result.items;
    filesTotal.value = result.total;
    filesPage.value = result.page;
    filesPageSize.value = result.pageSize;
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    files.value = [];
    filesTotal.value = 0;
  } finally {
    filesLoading.value = false;
  }
};

const loadDirectories = async () => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  directoriesLoading.value = true;

  try {
    const result = await getKnowledgeDirectories(selectedKnowledgeBaseId.value);
    directories.value = result.items;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "目录加载失败，请稍后重试。");
    directories.value = [];
  } finally {
    directoriesLoading.value = false;
  }
};

const loadDepartments = async () => {
  if (!canReviewMaterials.value || departmentsLoading.value) {
    return;
  }

  departmentsLoading.value = true;
  try {
    const result = await listDepartments();
    departments.value = result.items.filter((department) => department.status === "active");
  } catch {
    departments.value = [];
  } finally {
    departmentsLoading.value = false;
  }
};

const refreshDetailResources = async () => {
  await Promise.all([loadDetail(), loadChunks(), loadFiles(), loadDirectories()]);
};

const selectKnowledgeBaseForWorkspace = async (
  knowledgeBase: KnowledgeBase,
  options: { resetFilters?: boolean; tab?: "chunks" | "files" | "text-import" } = {}
) => {
  selectedKnowledgeBaseId.value = knowledgeBase.id;
  detail.value = null;
  directories.value = [];
  activeTab.value = options.tab ?? "files";

  if (options.resetFilters !== false) {
    resetResourcePaginationAndFilters();
  }

  void loadDepartments();
  await refreshDetailResources();
};

const getDefaultWorkspaceKnowledgeBase = (items: KnowledgeBase[]) =>
  items.find((item) => item.status === "active" || item.status === "enabled") ?? items[0] ?? null;

const ensureWorkspaceKnowledgeBase = async (items: KnowledgeBase[]) => {
  if (items.length === 0) {
    clearWorkspaceKnowledgeBase();
    return;
  }

  const current = items.find((item) => item.id === selectedKnowledgeBaseId.value);

  if (!current) {
    const nextKnowledgeBase = getDefaultWorkspaceKnowledgeBase(items);

    if (nextKnowledgeBase) {
      await selectKnowledgeBaseForWorkspace(nextKnowledgeBase, {
        resetFilters: true,
        tab: "files"
      });
    }
    return;
  }

  if (!detail.value) {
    await selectKnowledgeBaseForWorkspace(current, {
      resetFilters: false,
      tab: activeTab.value
    });
  }
};

const openDetailDrawer = async (knowledgeBase: KnowledgeBase) => {
  knowledgeManagerVisible.value = false;
  await selectKnowledgeBaseForWorkspace(knowledgeBase, {
    resetFilters: true,
    tab: "files"
  });
};

const handleKnowledgeBaseSwitch = async (knowledgeBaseId: string) => {
  const knowledgeBase = knowledgeBases.value.find((item) => item.id === knowledgeBaseId);

  if (!knowledgeBase) {
    return;
  }

  await selectKnowledgeBaseForWorkspace(knowledgeBase, {
    resetFilters: true,
    tab: "files"
  });
};

const resetResourceFilters = () => {
  Object.assign(chunkFilters, {
    materialType: undefined,
    productLine: undefined,
    search: undefined,
    sourceType: undefined,
    tags: undefined
  });
  Object.assign(fileFilters, {
    applicableModule: undefined,
    directoryId: undefined,
    fileType: undefined,
    materialType: undefined,
    materialTopic: undefined,
    officialCitationStatus: undefined,
    parseStatus: undefined,
    reviewStatus: undefined,
    search: undefined,
    trustLevel: undefined
  });
};

const openRoutedKnowledgeFile = async () => {
  const knowledgeBaseId =
    typeof route.query.knowledgeBaseId === "string" ? route.query.knowledgeBaseId : "";
  const knowledgeFileId =
    typeof route.query.knowledgeFileId === "string" ? route.query.knowledgeFileId : "";

  if (!knowledgeBaseId) {
    return;
  }

  selectedKnowledgeBaseId.value = knowledgeBaseId;
  detail.value = null;
  directories.value = [];
  activeTab.value = "files";
  chunksPage.value = 1;
  filesPage.value = 1;
  resetResourceFilters();
  void loadDepartments();
  await refreshDetailResources();

  if (knowledgeFileId) {
    const fileDetail = await getKnowledgeFile(knowledgeFileId);
    await handleFileDetail(fileDetail.knowledgeFile);
  }
};

const handleFormSubmit = async (
  payload: CreateKnowledgeBasePayload | UpdateKnowledgeBasePayload
) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    if (formMode.value === "create") {
      await createKnowledgeBase(payload as CreateKnowledgeBasePayload);
      ElMessage.success("企业 GEO 知识库已创建。");
    } else if (editingKnowledgeBase.value) {
      await updateKnowledgeBase(editingKnowledgeBase.value.id, payload);
      ElMessage.success("企业 GEO 知识库已更新。");
      if (editingKnowledgeBase.value.id === selectedKnowledgeBaseId.value) {
        await loadDetail();
      }
    }

    formVisible.value = false;
    await loadKnowledgeBases();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally {
    formSubmitting.value = false;
  }
};

const handleDeleteKnowledgeBase = async (knowledgeBase: KnowledgeBase) => {
  try {
    await ElMessageBox.confirm(
      `确认删除这个企业 GEO 知识库吗？关联文件和知识片段会同步软删除。\n${knowledgeBase.name}`,
      "删除知识库",
      {
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        type: "warning"
      }
    );

    await deleteKnowledgeBase(knowledgeBase.id);
    ElMessage.success("知识库已软删除。");
    if (knowledgeBase.id === selectedKnowledgeBaseId.value) {
      selectedKnowledgeBaseId.value = "";
      detail.value = null;
    }
    await loadKnowledgeBases();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    }
  }
};

const handleTextImport = async (payload: ManualKnowledgeMaterialPayload) => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  textImportSubmitting.value = true;

  try {
    await createManualKnowledgeMaterial(selectedKnowledgeBaseId.value, payload);
    ElMessage.success(
      payload.reviewStatus === "pending"
        ? "资料已保存。待审核资料不会被售后问答或 GEO 内容正式引用。"
        : "资料已保存，并生成知识片段。"
    );
    activeTab.value = "files";
    chunksPage.value = 1;
    await Promise.all([loadDetail(), loadChunks(), loadFiles()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "手动资料保存失败，请稍后重试。");
  } finally {
    textImportSubmitting.value = false;
  }
};

const handleUploadFile = async (payload: {
  file: File;
  extraFields: UploadKnowledgeFileExtraFields;
}) => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  uploading.value = true;

  try {
    const result = await uploadKnowledgeFile(
      selectedKnowledgeBaseId.value,
      payload.file,
      payload.extraFields
    );
    if (result.parseStatus === "failed") {
      ElMessage.warning(
        result.errorMessage || "文件已保存，但解析失败，请查看错误信息后重新解析。"
      );
    } else {
      ElMessage.success(
        payload.extraFields.reviewStatus === "pending"
          ? `资料已保存，生成 ${result.createdChunksCount} 条知识片段；待审核资料不会被正式引用。`
          : `文件解析成功，生成 ${result.createdChunksCount} 条知识片段。`
      );
    }
    activeTab.value = "files";
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件上传失败，请稍后重试。");
  } finally {
    uploading.value = false;
  }
};

const handleCreateDirectory = async (
  payload:
    | string
    | {
        name: string;
        parentId?: string;
        selectAfterCreate?: boolean;
        onCreated?: (directory: KnowledgeDirectory) => void;
        onFinished?: () => void;
      }
) => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  const request = typeof payload === "string" ? { name: payload } : payload;

  try {
    const directory = await createKnowledgeDirectory(selectedKnowledgeBaseId.value, {
      name: request.name,
      parentId: request.parentId
    });
    ElMessage.success("目录已创建。");
    await loadDirectories();
    if (request.selectAfterCreate) {
      request.onCreated?.(directory);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "目录创建失败，请稍后重试。");
  } finally {
    request.onFinished?.();
  }
};

const handleRenameDirectory = async (payload: { id: string; name: string }) => {
  try {
    await updateKnowledgeDirectory(payload.id, { name: payload.name });
    ElMessage.success("目录名称已更新。");
    await Promise.all([loadDirectories(), loadFiles()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "目录重命名失败，请稍后重试。");
  }
};

const handleDisableDirectory = async (directory: KnowledgeDirectory) => {
  try {
    await ElMessageBox.confirm(
      "停用后不再用于新资料归类，已有资料仍可查看。",
      `停用目录：${directory.name}`,
      {
        cancelButtonText: "取消",
        confirmButtonText: "停用",
        type: "warning"
      }
    );
    await disableKnowledgeDirectory(directory.id);
    ElMessage.success("目录已停用。");
    await Promise.all([loadDirectories(), loadFiles()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "目录停用失败，请稍后重试。");
    }
  }
};

const addRunningId = (target: { value: string[] }, id: string) => {
  target.value = Array.from(new Set([...target.value, id]));
};

const removeRunningId = (target: { value: string[] }, id: string) => {
  target.value = target.value.filter((item) => item !== id);
};

const handleFileDetail = async (file: KnowledgeFile) => {
  try {
    const fileDetail = await getKnowledgeFile(file.id);
    const latestChunks =
      fileDetail.latestChunks.map((chunk) => `- ${chunk.title}`).join("\n") || "暂无最近知识片段";
    const parseStatusLabel =
      parseStatusLabelMap[fileDetail.knowledgeFile.parseStatus] ??
      fileDetail.knowledgeFile.parseStatus;
    const materialTypeLabel =
      materialTypeLabelMap[fileDetail.knowledgeFile.materialType] ??
      fileDetail.knowledgeFile.materialType;
    const materialTopicLabel =
      materialTopicLabelMap[fileDetail.knowledgeFile.materialTopic ?? ""] ??
      fileDetail.knowledgeFile.materialTopic ??
      "未设置";
    const reviewStatusLabel =
      reviewStatusLabelMap[fileDetail.knowledgeFile.reviewStatus] ??
      fileDetail.knowledgeFile.reviewStatus;
    const trustLevelLabel =
      trustLevelLabelMap[fileDetail.knowledgeFile.trustLevel] ??
      fileDetail.knowledgeFile.trustLevel;
    const applicableModules =
      fileDetail.knowledgeFile.applicableModules
        .map((item) => applicableModuleLabelMap[item] ?? item)
        .join("、") || "未设置";
    const directoryName = fileDetail.knowledgeFile.directoryName ?? "默认根目录";
    const citationStatus = `${getKnowledgeFileCitationLabel(fileDetail.knowledgeFile)}（${getKnowledgeFileCitationDescription(fileDetail.knowledgeFile)}）`;
    const sourceDescription =
      formatKnowledgeSourceDescription(fileDetail.knowledgeFile.sourceDescription) ?? "未设置";
    const evidenceType = inferEvidenceType(fileDetail.knowledgeFile);
    const evidenceTypeNote =
      evidenceType.value === "forbidden_expression"
        ? "\n证据说明：约束类资料，用于生成内容时避开，不作为正向引用依据。"
        : "";
    await ElMessageBox.alert(
      `资料标题：${fileDetail.knowledgeFile.title}\n原始文件：${fileDetail.knowledgeFile.fileName}\n所属目录：${directoryName}\n资料类型：${materialTypeLabel}\n资料主题：${materialTopicLabel}\n证据类型：${evidenceType.label}${evidenceTypeNote}\n资料状态：${reviewStatusLabel}\n可靠程度：${trustLevelLabel}\nAI 可引用状态：${citationStatus}\n可用场景：${applicableModules}\n来源说明：${sourceDescription}\n\n解析状态：${parseStatusLabel}\n知识片段数：${fileDetail.chunksCount}\n\n最近片段：\n${latestChunks}`,
      "文件详情",
      {
        confirmButtonText: "知道了"
      }
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件详情加载失败。");
  }
};

const openFileEditDialog = async (file: KnowledgeFile) => {
  fileEditDialogVisible.value = true;
  fileEditLoading.value = true;
  fileEditError.value = "";
  editingFile.value = file;

  try {
    const fileDetail = await getKnowledgeFile(file.id);
    editingFile.value = fileDetail.knowledgeFile;
    Object.assign(fileEditForm, {
      title: fileDetail.knowledgeFile.title,
      materialType: fileDetail.knowledgeFile.materialType,
      materialTopic: fileDetail.knowledgeFile.materialTopic ?? "",
      reviewStatus: fileDetail.knowledgeFile.reviewStatus,
      trustLevel: fileDetail.knowledgeFile.trustLevel,
      applicableModules: [...fileDetail.knowledgeFile.applicableModules],
      directoryId: fileDetail.knowledgeFile.directoryId ?? "",
      sourceDescription:
        formatKnowledgeSourceDescription(fileDetail.knowledgeFile.sourceDescription) ?? "",
      content: fileDetail.latestChunks[0]?.content ?? ""
    });
  } catch (error) {
    fileEditError.value = error instanceof Error ? error.message : "资料详情加载失败。";
  } finally {
    fileEditLoading.value = false;
  }
};

const handleFileEditSubmit = async () => {
  const file = editingFile.value;
  const title = fileEditForm.title.trim();
  const content = fileEditForm.content.trim();

  if (!file) {
    return;
  }
  if (!title) {
    fileEditError.value = "资料标题不能为空。";
    return;
  }
  if (canEditFileContent.value && content.length < 10) {
    fileEditError.value = "整理后的正文内容至少需要 10 个字符。";
    return;
  }

  fileEditSubmitting.value = true;
  fileEditError.value = "";

  try {
    const payload: KnowledgeMaterialMetadataPayload = {
      title,
      directoryId: fileEditForm.directoryId || undefined,
      materialType: fileEditForm.materialType,
      materialTopic: fileEditForm.materialTopic.trim() || undefined,
      reviewStatus: fileEditForm.reviewStatus,
      trustLevel: fileEditForm.trustLevel,
      applicableModules: fileEditForm.applicableModules,
      sourceDescription: fileEditForm.sourceDescription.trim() || undefined,
      ...(canEditFileContent.value
        ? {
            content
          }
        : {})
    };

    await updateKnowledgeFileMetadata(file.id, payload);
    ElMessage.success("保存资料属性成功。");
    fileEditDialogVisible.value = false;
    editingFile.value = null;
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    fileEditError.value = error instanceof Error ? error.message : "资料属性保存失败。";
  } finally {
    fileEditSubmitting.value = false;
  }
};

const handleReparseFile = async (file: KnowledgeFile) => {
  try {
    await ElMessageBox.confirm(
      `确认重新解析该资料吗？\n重新解析会重新生成解析结果，可能覆盖当前解析片段，但不会删除原始资料。\n${file.title}`,
      "重新解析资料",
      {
        cancelButtonText: "取消",
        confirmButtonText: "重新解析",
        type: "warning"
      }
    );

    addRunningId(reparsingIds, file.id);
    const result = await reparseKnowledgeFile(file.id);
    if (result.parseStatus === "failed") {
      ElMessage.warning(result.errorMessage || "重新解析失败，错误信息已记录。");
    } else {
      ElMessage.success(`重新解析成功，生成 ${result.createdChunksCount} 条知识片段。`);
    }
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "重新解析失败，请稍后重试。");
    }
  } finally {
    removeRunningId(reparsingIds, file.id);
  }
};

const handleDeleteFile = async (file: KnowledgeFile) => {
  try {
    await ElMessageBox.confirm(
      `确认删除该文件资料吗？关联知识片段会同步软删除。\n${file.fileName}`,
      "删除文件资料",
      {
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        type: "warning"
      }
    );

    addRunningId(deletingFileIds, file.id);
    await deleteKnowledgeFile(file.id);
    ElMessage.success("文件资料已软删除。");
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除文件失败，请稍后重试。");
    }
  } finally {
    removeRunningId(deletingFileIds, file.id);
  }
};

const handleChunkSearch = (query: KnowledgeChunkQuery) => {
  Object.assign(chunkFilters, query);
  chunksPage.value = 1;
  void loadChunks();
};

const handleChunkReset = () => {
  Object.assign(chunkFilters, {
    materialType: undefined,
    productLine: undefined,
    search: undefined,
    sourceType: undefined,
    tags: undefined
  });
  chunksPage.value = 1;
  void loadChunks();
};

const handleChunkPageChange = (nextPage: number) => {
  chunksPage.value = nextPage;
  void loadChunks();
};

const handleChunkPageSizeChange = (nextPageSize: number) => {
  chunksPageSize.value = nextPageSize;
  chunksPage.value = 1;
  void loadChunks();
};

const openChunkEditDialog = (chunk: KnowledgeChunk) => {
  editingChunk.value = chunk;
  chunkFormError.value = "";
  chunkDialogVisible.value = true;
};

const handleChunkSubmit = async (payload: UpdateKnowledgeChunkPayload) => {
  if (!editingChunk.value) {
    return;
  }

  chunkFormSubmitting.value = true;
  chunkFormError.value = "";

  try {
    await updateKnowledgeChunk(editingChunk.value.id, payload);
    ElMessage.success("知识片段已更新。");
    chunkDialogVisible.value = false;
    await Promise.all([loadDetail(), loadChunks()]);
  } catch (error) {
    chunkFormError.value = error instanceof Error ? error.message : "知识片段保存失败。";
  } finally {
    chunkFormSubmitting.value = false;
  }
};

const handleDeleteChunk = async (chunk: KnowledgeChunk) => {
  try {
    await ElMessageBox.confirm(`确认删除该知识片段吗？\n${chunk.title}`, "删除知识片段", {
      cancelButtonText: "取消",
      confirmButtonText: "删除",
      type: "warning"
    });

    addRunningId(deletingChunkIds, chunk.id);
    await deleteKnowledgeChunk(chunk.id);
    ElMessage.success("知识片段已软删除。");
    await Promise.all([loadDetail(), loadChunks()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除知识片段失败。");
    }
  } finally {
    removeRunningId(deletingChunkIds, chunk.id);
  }
};

const handleFileSearch = (query: KnowledgeFileQuery) => {
  Object.assign(fileFilters, query);
  filesPage.value = 1;
  void loadFiles();
};

const handleFileReset = () => {
  Object.assign(fileFilters, {
    applicableModule: undefined,
    directoryId: undefined,
    fileType: undefined,
    materialType: undefined,
    materialTopic: undefined,
    officialCitationStatus: undefined,
    parseStatus: undefined,
    reviewStatus: undefined,
    search: undefined,
    trustLevel: undefined
  });
  filesPage.value = 1;
  void loadFiles();
};

const handleFilePageChange = (nextPage: number) => {
  filesPage.value = nextPage;
  void loadFiles();
};

const handleFilePageSizeChange = (nextPageSize: number) => {
  filesPageSize.value = nextPageSize;
  filesPage.value = 1;
  void loadFiles();
};

onMounted(async () => {
  await loadKnowledgeBases();
  await openRoutedKnowledgeFile();
});
</script>

<template>
  <section class="knowledge-page core-list-page kb-page">
    <header class="knowledge-workbench-bar core-list-header kb-topbar">
      <div class="knowledge-workbench-bar__main">
        <div class="knowledge-workbench-titleline">
          <span class="kb-topbar__eyebrow">当前知识库</span>
          <h1>{{ selectedKnowledgeBase?.name ?? "未选择" }}</h1>
          <div class="knowledge-workbench-meta-line" aria-label="当前知识库摘要">
            <template v-if="selectedKnowledgeBase">
              <span v-for="item in workspaceSummaryItems" :key="item.label">
                {{ item.label }} {{ item.value }}{{ item.suffix ?? "" }}
              </span>
            </template>
            <span v-else>暂无知识库</span>
            <span v-if="lastLoadedAt">更新 {{ lastLoadedAt }}</span>
          </div>
        </div>
      </div>
      <div class="knowledge-workbench-actions kb-topbar__actions">
        <div class="knowledge-workbench-switcher">
          <span>切换知识库</span>
          <el-select
            :model-value="selectedKnowledgeBaseId"
            class="knowledge-workbench-select"
            filterable
            placeholder="选择知识库"
            :loading="loading"
            @change="handleKnowledgeBaseSwitch"
          >
            <el-option
              v-for="knowledgeBase in knowledgeBaseOptions"
              :key="knowledgeBase.id"
              :label="knowledgeBase.name"
              :value="knowledgeBase.id"
            />
          </el-select>
        </div>
        <el-button @click="knowledgeManagerVisible = true">管理知识库</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadKnowledgeBases">
          刷新
        </el-button>
        <el-button v-if="canCreateKnowledgeBase" type="primary" @click="openCreateDialog">
          新建知识库
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="hasTableError" title="知识库加载失败" :message="tableError" />

    <section v-if="isEmpty" class="knowledge-workbench-empty">
      <el-empty description="暂无知识库，请先新建知识库" :image-size="96">
        <el-button v-if="canCreateKnowledgeBase" type="primary" @click="openCreateDialog">
          新建知识库
        </el-button>
      </el-empty>
    </section>

    <section v-else class="knowledge-workbench-shell knowledge-workbench-main core-data-panel kb-shell">
      <KnowledgeBaseDetailDrawer
        v-if="selectedKnowledgeBaseId"
        v-model:active-tab="activeTab"
        :model-value="true"
        embedded
        :detail="detail"
        :detail-loading="detailLoading"
        :chunks="chunks"
        :chunks-total="chunksTotal"
        :chunks-page="chunksPage"
        :chunks-page-size="chunksPageSize"
        :chunks-loading="chunksLoading"
        :files="files"
        :files-total="filesTotal"
        :files-page="filesPage"
        :files-page-size="filesPageSize"
        :files-loading="filesLoading"
        :directories="directories"
        :directories-loading="directoriesLoading"
        :text-import-submitting="textImportSubmitting"
        :uploading="uploading"
        :can-manage="canManageKnowledgeBase(selectedKnowledgeBase)"
        :can-review="canReviewMaterials"
        :departments="departments"
        :reparsing-ids="reparsingIds"
        :deleting-file-ids="deletingFileIds"
        :deleting-chunk-ids="deletingChunkIds"
        @refresh="refreshDetailResources"
        @text-import="handleTextImport"
        @upload-file="handleUploadFile"
        @search-chunks="handleChunkSearch"
        @reset-chunks="handleChunkReset"
        @page-chunks="handleChunkPageChange"
        @size-chunks="handleChunkPageSizeChange"
        @edit-chunk="openChunkEditDialog"
        @delete-chunk="handleDeleteChunk"
        @search-files="handleFileSearch"
        @reset-files="handleFileReset"
        @page-files="handleFilePageChange"
        @size-files="handleFilePageSizeChange"
        @file-detail="handleFileDetail"
        @file-edit="openFileEditDialog"
        @reparse-file="handleReparseFile"
        @delete-file="handleDeleteFile"
        @create-directory="handleCreateDirectory"
        @rename-directory="handleRenameDirectory"
        @disable-directory="handleDisableDirectory"
      />
    </section>

    <el-dialog
      v-model="knowledgeManagerVisible"
      title="切换 / 管理知识库"
      width="1080px"
      class="knowledge-manager-dialog"
    >
      <KnowledgeBaseFilters
        :model-value="filters"
        :loading="loading"
        @update:model-value="Object.assign(filters, $event)"
        @search="handleSearch"
        @reset="handleReset"
        @create="openCreateDialog"
      />

      <section class="knowledge-asset-overview core-summary-row" aria-label="知识库资产概览">
        <article
          v-for="metric in knowledgeAssetMetrics"
          :key="metric.label"
          :class="{ 'is-warning': metric.label === '待补说明' }"
        >
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.note }}</small>
        </article>
      </section>

      <section class="knowledge-table-panel knowledge-table-panel--manager core-data-panel">
        <div class="knowledge-table-header">
          <div>
            <p class="section-kicker">事实底座</p>
            <h2>企业事实资料库</h2>
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="knowledgeBases"
          class="knowledge-base-table"
          row-key="id"
          border
          empty-text="暂无企业 GEO 知识库，可先新建知识库并导入文件或手动资料。"
        >
          <el-table-column prop="name" label="知识库名称" min-width="220" fixed="left">
            <template #default="{ row }: { row: KnowledgeBase }">
              <strong class="knowledge-main-text">{{ row.name }}</strong>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明摘要" min-width="260">
            <template #default="{ row }: { row: KnowledgeBase }">
              <span class="knowledge-description-line">
                {{ formatKnowledgeDescription(row.description) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="104">
            <template #default="{ row }: { row: KnowledgeBase }">
              <el-tag
                class="knowledge-status-tag"
                :type="row.status === 'active' || row.status === 'enabled' ? 'success' : 'info'"
                effect="plain"
              >
                {{ knowledgeBaseStatusLabelMap[row.status] ?? row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="productLine" label="产品线 / 场景" min-width="150">
            <template #default="{ row }: { row: KnowledgeBase }">
              {{ formatOptional(row.productLine) }}
            </template>
          </el-table-column>
          <el-table-column prop="visibility" label="可见性" width="104">
            <template #default="{ row }: { row: KnowledgeBase }">
              <el-tag :type="visibilityTagTypeMap[row.visibility]" effect="plain">
                {{ visibilityLabelMap[row.visibility] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" min-width="168">
            <template #default="{ row }: { row: KnowledgeBase }">
              {{ formatDateTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="154" fixed="right">
            <template #default="{ row }: { row: KnowledgeBase }">
              <el-button link type="primary" @click="openDetailDrawer(row)">进入</el-button>
              <el-button v-if="canManageKnowledgeBase(row)" link type="primary" @click="openEditDialog(row)">
                编辑
              </el-button>
              <el-button
                v-if="canManageKnowledgeBase(row)"
                link
                class="knowledge-danger-action"
                @click="handleDeleteKnowledgeBase(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty
              :description="
                isEmpty
                  ? '暂无企业 GEO 知识库，可先新建知识库并导入企业事实资料。'
                  : '正在加载企业 GEO 知识库'
              "
            >
              <template #image>
                <div class="empty-mark">GEO</div>
              </template>
            </el-empty>
          </template>
        </el-table>

        <div class="knowledge-pagination">
          <span>共 {{ total }} 个企业 GEO 知识库</span>
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="sizes, prev, pager, next"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </section>
    </el-dialog>

    <KnowledgeBaseFormDialog
      v-model="formVisible"
      :mode="formMode"
      :knowledge-base="editingKnowledgeBase"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleFormSubmit"
    />

    <el-dialog
      v-model="fileEditDialogVisible"
      title="审核 / 编辑资料"
      width="760px"
      class="knowledge-file-edit-dialog"
    >
      <div v-loading="fileEditLoading" class="file-edit-panel">
        <el-alert
          v-if="fileEditError"
          :title="fileEditError"
          type="error"
          show-icon
          :closable="false"
        />
        <el-alert
          title="AI 可引用状态由资料状态、可靠程度和删除状态自动推导，不能手动编辑。"
          type="info"
          show-icon
          :closable="false"
        />
        <el-form label-position="top">
          <section class="file-edit-section">
            <div class="file-edit-section__header">
              <p class="section-kicker">基础信息</p>
              <strong>资料归类</strong>
            </div>
            <el-form-item label="资料标题" required>
              <el-input v-model="fileEditForm.title" maxlength="120" show-word-limit />
            </el-form-item>
            <el-form-item label="所属目录">
              <el-select
                v-model="fileEditForm.directoryId"
                class="full-width"
                filterable
                placeholder="默认根目录"
              >
                <el-option
                  v-for="directory in activeDirectoryOptions"
                  :key="directory.id"
                  :label="directory.name"
                  :value="directory.id"
                />
              </el-select>
              <small class="form-hint">
                只能选择启用目录；停用目录下已有资料仍可查看。
              </small>
            </el-form-item>
            <div class="file-edit-grid">
              <el-form-item label="资料类型">
                <el-select v-model="fileEditForm.materialType" class="full-width">
                  <el-option
                    v-for="option in materialTypeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="资料主题">
                <el-select
                  v-model="fileEditForm.materialTopic"
                  class="full-width"
                  clearable
                  filterable
                  allow-create
                >
                  <el-option
                    v-for="option in materialTopicOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </div>
          </section>

          <section class="file-edit-section">
            <div class="file-edit-section__header">
              <p class="section-kicker">审核与引用</p>
              <strong>状态由规则推导</strong>
            </div>
            <div class="file-edit-grid">
              <el-form-item label="资料状态">
                <el-select v-model="fileEditForm.reviewStatus" class="full-width">
                  <el-option
                    v-for="option in reviewStatusOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="可靠程度">
                <el-select v-model="fileEditForm.trustLevel" class="full-width">
                  <el-option
                    v-for="option in trustLevelOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="可用场景">
              <el-select
                v-model="fileEditForm.applicableModules"
                class="full-width"
                multiple
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option
                  v-for="option in applicableModuleOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <section class="file-edit-citation-preview">
              <span>当前 AI 可引用状态</span>
              <el-tag
                :type="fileEditCitationPreview.label === '可被 AI 引用' ? 'success' : 'warning'"
                effect="plain"
              >
                {{ fileEditCitationPreview.label }}
              </el-tag>
              <small>{{ fileEditCitationPreview.reasons }}</small>
            </section>
          </section>

          <section class="file-edit-section">
            <div class="file-edit-section__header">
              <p class="section-kicker">正文内容</p>
              <strong>资料正文与来源</strong>
            </div>
            <el-form-item label="整理后的正文内容">
              <el-input
                v-model="fileEditForm.content"
                type="textarea"
                :rows="8"
                maxlength="8000"
                show-word-limit
                :disabled="!canEditFileContent"
              />
              <small class="form-hint">
                {{
                  canEditFileContent
                    ? "手动录入资料会同步更新正文片段。"
                    : "文件上传资料请编辑知识片段或重新解析，原文件正文不在此处直接修改。"
                }}
              </small>
            </el-form-item>
            <el-form-item label="来源说明">
              <el-input
                v-model="fileEditForm.sourceDescription"
                type="textarea"
                :rows="3"
                maxlength="600"
                show-word-limit
              />
            </el-form-item>
          </section>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="fileEditDialogVisible = false">取消</el-button>
        <el-button :loading="fileEditSubmitting" type="primary" @click="handleFileEditSubmit">
          保存资料属性
        </el-button>
      </template>
    </el-dialog>

    <KnowledgeChunkFormDialog
      v-model="chunkDialogVisible"
      :chunk="editingChunk"
      :submitting="chunkFormSubmitting"
      :error-message="chunkFormError"
      @submit="handleChunkSubmit"
    />
  </section>
</template>

<style scoped>
.file-edit-panel {
  display: grid;
  gap: 14px;
}

.file-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.file-edit-section {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.file-edit-section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.file-edit-section__header strong {
  color: #334155;
  font-size: 13px;
}

.file-edit-citation-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.file-edit-citation-preview span {
  color: #334155;
  font-weight: 600;
}

.file-edit-citation-preview small,
.form-hint {
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

.full-width {
  width: 100%;
}

@media (max-width: 720px) {
  .file-edit-grid {
    grid-template-columns: 1fr;
  }
}
</style>

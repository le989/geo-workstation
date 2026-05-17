<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  deleteKnowledgeChunk,
  deleteKnowledgeFile,
  getKnowledgeBase,
  getKnowledgeBases,
  getKnowledgeChunks,
  getKnowledgeFile,
  getKnowledgeFiles,
  reparseKnowledgeFile,
  textImportKnowledge,
  updateKnowledgeBase,
  updateKnowledgeChunk,
  uploadKnowledgeFile,
  type CreateKnowledgeBasePayload,
  type KnowledgeBase,
  type KnowledgeBaseDetail,
  type KnowledgeBaseQuery,
  type KnowledgeChunk,
  type KnowledgeChunkQuery,
  type KnowledgeFile,
  type KnowledgeFileQuery,
  type TextImportPayload,
  type UpdateKnowledgeBasePayload,
  type UpdateKnowledgeChunkPayload,
  type UploadKnowledgeFileExtraFields
} from "@/api/knowledge";
import AppErrorState from "@/components/AppErrorState.vue";
import KnowledgeBaseDetailDrawer from "@/components/KnowledgeBaseDetailDrawer.vue";
import KnowledgeBaseFilters from "@/components/KnowledgeBaseFilters.vue";
import KnowledgeBaseFormDialog from "@/components/KnowledgeBaseFormDialog.vue";
import KnowledgeChunkFormDialog from "@/components/KnowledgeChunkFormDialog.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { knowledgeBaseStatusLabelMap, parseStatusLabelMap } from "@/config/knowledge-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction } from "@/utils/permission";

const authStore = useAuthStore();
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

const drawerVisible = ref(false);
const activeTab = ref<"chunks" | "files" | "text-import">("chunks");
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

const textImportSubmitting = ref(false);
const uploading = ref(false);
const reparsingIds = ref<string[]>([]);
const deletingFileIds = ref<string[]>([]);
const deletingChunkIds = ref<string[]>([]);

const chunkDialogVisible = ref(false);
const editingChunk = ref<KnowledgeChunk | null>(null);
const chunkFormSubmitting = ref(false);
const chunkFormError = ref("");

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && knowledgeBases.value.length === 0);
const selectedKnowledgeBase = computed(
  () =>
    detail.value?.knowledgeBase ??
    knowledgeBases.value.find((item) => item.id === selectedKnowledgeBaseId.value) ??
    null
);
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
  } catch (error) {
    tableError.value = getErrorMessage(error);
    knowledgeBases.value = [];
    total.value = 0;
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

const refreshDetailResources = async () => {
  await Promise.all([loadDetail(), loadChunks(), loadFiles()]);
};

const openDetailDrawer = async (knowledgeBase: KnowledgeBase) => {
  selectedKnowledgeBaseId.value = knowledgeBase.id;
  detail.value = null;
  activeTab.value = "chunks";
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
    fileType: undefined,
    parseStatus: undefined,
    search: undefined
  });
  drawerVisible.value = true;
  await refreshDetailResources();
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
      drawerVisible.value = false;
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

const handleTextImport = async (payload: TextImportPayload) => {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  textImportSubmitting.value = true;

  try {
    await textImportKnowledge(selectedKnowledgeBaseId.value, payload);
    ElMessage.success("文本资料已导入为 GEO 知识片段。");
    activeTab.value = "chunks";
    chunksPage.value = 1;
    await Promise.all([loadDetail(), loadChunks()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文本导入失败，请稍后重试。");
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
      ElMessage.success(`文件解析成功，生成 ${result.createdChunksCount} 条知识片段。`);
    }
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件上传失败，请稍后重试。");
  } finally {
    uploading.value = false;
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
    await ElMessageBox.alert(
      `文件资料：${fileDetail.knowledgeFile.fileName}\n\n解析状态：${parseStatusLabel}\n知识片段数：${fileDetail.chunksCount}\n\n最近片段：\n${latestChunks}`,
      "文件详情",
      {
        confirmButtonText: "知道了"
      }
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "文件详情加载失败。");
  }
};

const handleReparseFile = async (file: KnowledgeFile) => {
  try {
    addRunningId(reparsingIds, file.id);
    const result = await reparseKnowledgeFile(file.id);
    if (result.parseStatus === "failed") {
      ElMessage.warning(result.errorMessage || "重新解析失败，错误信息已记录。");
    } else {
      ElMessage.success(`重新解析成功，生成 ${result.createdChunksCount} 条知识片段。`);
    }
    await Promise.all([loadDetail(), loadFiles(), loadChunks()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "重新解析失败，请稍后重试。");
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
    fileType: undefined,
    parseStatus: undefined,
    search: undefined
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

onMounted(() => {
  void loadKnowledgeBases();
});
</script>

<template>
  <section class="knowledge-page">
    <header class="knowledge-hero">
      <div class="knowledge-hero__copy">
        <el-tag class="knowledge-hero__tag" type="success" effect="plain">
          GEO 知识库
        </el-tag>
        <h1>知识库</h1>
        <p>管理产品资料、FAQ 和知识片段，为内容生成、事实边界和 GEO 复测提供可信依据。</p>
        <div class="knowledge-flow-cue" aria-label="知识库建设流程">
          <span>新建知识库</span>
          <span>上传 / 粘贴资料</span>
          <span>解析为知识片段</span>
          <span>用于内容生成</span>
        </div>
        <strong>知识库资料用于补齐 GEO 诊断中的事实缺口，并为内容生成提供可引用素材。</strong>
      </div>
      <div class="knowledge-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" @click="loadKnowledgeBases">
          刷新列表
        </el-button>
        <el-button v-if="canCreateKnowledgeBase" type="primary" @click="openCreateDialog">
          新建知识库
        </el-button>
      </div>
    </header>

    <section class="knowledge-asset-overview" aria-label="知识库资产概览">
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

    <KnowledgeBaseFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreateDialog"
    />

    <AppErrorState v-if="hasTableError" title="知识库加载失败" :message="tableError" />

    <section class="knowledge-table-panel">
      <div class="knowledge-table-header">
        <div>
          <p class="section-kicker">事实底座</p>
          <h2>企业事实资料库</h2>
          <p>查看知识资产建设情况，进入详情维护文件和片段。</p>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="knowledgeBases"
        class="knowledge-base-table"
        row-key="id"
        border
        empty-text="暂无企业 GEO 知识库，可先新建知识库并导入文本或 txt/md/csv 文件。"
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
            <el-button link type="primary" @click="openDetailDrawer(row)">查看</el-button>
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

    <KnowledgeBaseFormDialog
      v-model="formVisible"
      :mode="formMode"
      :knowledge-base="editingKnowledgeBase"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleFormSubmit"
    />

    <KnowledgeBaseDetailDrawer
      v-model="drawerVisible"
      v-model:active-tab="activeTab"
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
      :text-import-submitting="textImportSubmitting"
      :uploading="uploading"
      :can-manage="canManageKnowledgeBase(selectedKnowledgeBase)"
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
      @reparse-file="handleReparseFile"
      @delete-file="handleDeleteFile"
    />

    <KnowledgeChunkFormDialog
      v-model="chunkDialogVisible"
      :chunk="editingChunk"
      :submitting="chunkFormSubmitting"
      :error-message="chunkFormError"
      @submit="handleChunkSubmit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh } from "@element-plus/icons-vue";
import {
  createContentTask,
  deleteContentItem,
  exportContentItem,
  getContentTask,
  getContentTasks,
  retryContentTask,
  updateContentItem,
  type ContentItem,
  type ContentTask,
  type ContentTaskDetail,
  type ContentTaskQuery,
  type CreateContentTaskPayload,
  type UpdateContentItemPayload
} from "@/api/content";
import AppErrorState from "@/components/AppErrorState.vue";
import ContentGenerationTypeTag from "@/components/ContentGenerationTypeTag.vue";
import ContentItemFormDialog from "@/components/ContentItemFormDialog.vue";
import ContentTaskDetailDrawer from "@/components/ContentTaskDetailDrawer.vue";
import ContentTaskFilters from "@/components/ContentTaskFilters.vue";
import ContentTaskFormDialog from "@/components/ContentTaskFormDialog.vue";
import ContentTaskStatusTag from "@/components/ContentTaskStatusTag.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";

const tasks = ref<ContentTask[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const tableError = ref("");
const lastLoadedAt = ref("");

const filters = reactive<ContentTaskQuery>({
  page: 1,
  pageSize: 20
});

const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const createError = ref("");

const detailVisible = ref(false);
const detailLoading = ref(false);
const selectedTaskId = ref("");
const detail = ref<ContentTaskDetail | null>(null);
const retrying = ref(false);

const itemDialogVisible = ref(false);
const itemDialogMode = ref<"view" | "edit">("view");
const activeItem = ref<ContentItem | null>(null);
const itemSubmitting = ref(false);
const itemError = ref("");
const exportingIds = ref<string[]>([]);
const deletingIds = ref<string[]>([]);

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && tasks.value.length === 0);

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

const buildQuery = (): ContentTaskQuery => ({
  generationType: trimOptional(filters.generationType),
  page: page.value,
  pageSize: pageSize.value,
  productLine: trimOptional(filters.productLine),
  search: trimOptional(filters.search),
  status: filters.status,
  targetModel: trimOptional(filters.targetModel)
});

const loadTasks = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await getContentTasks(buildQuery());
    tasks.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
    lastLoadedAt.value = new Date().toLocaleString();
  } catch (error) {
    tableError.value = getErrorMessage(error);
    tasks.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  void loadTasks();
};

const handleReset = () => {
  Object.assign(filters, {
    generationType: undefined,
    page: 1,
    pageSize: pageSize.value,
    productLine: undefined,
    search: undefined,
    status: undefined,
    targetModel: undefined
  });
  page.value = 1;
  void loadTasks();
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadTasks();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadTasks();
};

const openCreateDialog = () => {
  createError.value = "";
  createDialogVisible.value = true;
};

const openDetailDrawer = async (task: ContentTask) => {
  selectedTaskId.value = task.id;
  detailVisible.value = true;
  await loadDetail();
};

const loadDetail = async () => {
  if (!selectedTaskId.value) {
    return;
  }

  detailLoading.value = true;

  try {
    detail.value = await getContentTask(selectedTaskId.value);
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
};

const handleCreateTask = async (payload: CreateContentTaskPayload) => {
  createSubmitting.value = true;
  createError.value = "";

  try {
    const created = await createContentTask(payload);
    createDialogVisible.value = false;
    ElMessage.success("GEO 内容任务已创建，内容项已生成。");
    await loadTasks();
    selectedTaskId.value = created.task.id;
    detail.value = created;
    detailVisible.value = true;
  } catch (error) {
    createError.value = error instanceof Error ? error.message : "创建内容任务失败。";
  } finally {
    createSubmitting.value = false;
  }
};

const handleRetry = async (task?: ContentTask) => {
  const targetTaskId = task?.id ?? selectedTaskId.value;

  if (!targetTaskId) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "确认重试失败内容任务吗？重试不会重复生成已成功内容项。",
      "重试内容任务",
      {
        cancelButtonText: "取消",
        confirmButtonText: "重试",
        type: "warning"
      }
    );

    retrying.value = true;
    const result = await retryContentTask(targetTaskId);
    detail.value = result;
    selectedTaskId.value = result.task.id;
    detailVisible.value = true;
    ElMessage.success("已重试失败内容项。");
    await loadTasks();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "重试失败，请稍后再试。");
    }
  } finally {
    retrying.value = false;
  }
};

const openItemDialog = (item: ContentItem, mode: "view" | "edit") => {
  activeItem.value = item;
  itemDialogMode.value = mode;
  itemError.value = "";
  itemDialogVisible.value = true;
};

const handleItemSubmit = async (payload: UpdateContentItemPayload) => {
  if (!activeItem.value) {
    return;
  }

  itemSubmitting.value = true;
  itemError.value = "";

  try {
    await updateContentItem(activeItem.value.id, payload);
    itemDialogVisible.value = false;
    ElMessage.success("GEO 内容项已更新。");
    await loadDetail();
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : "内容项保存失败。";
  } finally {
    itemSubmitting.value = false;
  }
};

const withIdFlag = async (list: typeof exportingIds, id: string, action: () => Promise<void>) => {
  list.value = [...list.value, id];
  try {
    await action();
  } finally {
    list.value = list.value.filter((itemId) => itemId !== id);
  }
};

const downloadMarkdown = (item: ContentItem, markdown: string) => {
  const blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `content-item-${item.id}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const handleExportMarkdown = async (item: ContentItem) => {
  try {
    await withIdFlag(exportingIds, item.id, async () => {
      const markdown = await exportContentItem(item.id);
      downloadMarkdown(item, markdown);
    });
    ElMessage.success("Markdown 已导出。");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "Markdown 导出失败。");
  }
};

const handleDeleteItem = async (item: ContentItem) => {
  try {
    await ElMessageBox.confirm(`确认移除该内容项吗？\n${item.title}`, "删除内容项", {
      cancelButtonText: "取消",
      confirmButtonText: "移除",
      type: "warning"
    });

    await withIdFlag(deletingIds, item.id, async () => {
      await deleteContentItem(item.id);
    });
    ElMessage.success("已移除该内容项。");
    await Promise.all([loadDetail(), loadTasks()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除内容项失败。");
    }
  }
};

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <section class="content-page">
    <header class="content-hero">
      <div>
        <el-tag type="success" effect="plain">GEO Content Generation</el-tag>
        <h1>GEO 内容生成</h1>
        <p>
          基于 GEO 提示词、企业知识库和指令模板生成可编辑的内容资产，用于支撑 AI
          问答、选型指南、应用方案、FAQ、国产替代和品牌可信度建设。
        </p>
        <strong> 默认使用 mock；选择 openai_compatible 时真实 AI 会消耗接口额度。 </strong>
      </div>
      <div class="content-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" @click="loadTasks">刷新列表</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog"> 创建内容任务 </el-button>
      </div>
    </header>

    <el-alert
      title="内容任务和内容项真实入库；API Key 由后端 .env 管理，前端不展示或保存密钥；不做 Word 导出、自动发布或外部媒体发布。"
      type="warning"
      :closable="false"
      show-icon
      class="content-boundary-alert"
    />

    <ContentTaskFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
    />

    <AppErrorState v-if="hasTableError" title="GEO 内容任务加载失败" :message="tableError" />

    <el-card class="content-table-card" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">Content Tasks</p>
            <h2>GEO 内容任务列表</h2>
            <span>查看每个任务服务的提示词、知识库、指令模板和 AI 生成状态。</span>
          </div>
          <strong>{{ total }} 个任务</strong>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tasks"
        border
        row-key="id"
        empty-text="暂无 GEO 内容任务"
      >
        <el-table-column label="任务名称" min-width="240" fixed>
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
            <p class="table-subtext">{{ formatOptional(row.productLine) }}</p>
          </template>
        </el-table-column>
        <el-table-column label="生成类型" width="140">
          <template #default="{ row }">
            <ContentGenerationTypeTag :type="row.generationType" />
          </template>
        </el-table-column>
        <el-table-column label="目标模型" width="150">
          <template #default="{ row }">{{ formatOptional(row.targetModel) }}</template>
        </el-table-column>
        <el-table-column label="任务状态" width="110">
          <template #default="{ row }">
            <ContentTaskStatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="provider / model" min-width="190">
          <template #default="{ row }">
            {{ formatOptional(row.provider) }} / {{ formatOptional(row.model) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openDetailDrawer(row)">查看详情</el-button>
            <el-button
              v-if="row.status === 'failed'"
              text
              type="warning"
              :loading="retrying && selectedTaskId === row.id"
              @click="handleRetry(row)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="isEmpty && !hasTableError"
        description="暂无内容任务，请先选择 GEO 提示词、知识库和指令模板创建任务。"
      />

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>

    <ContentTaskFormDialog
      v-model="createDialogVisible"
      :submitting="createSubmitting"
      :error-message="createError"
      @submit="handleCreateTask"
    />

    <ContentTaskDetailDrawer
      v-model="detailVisible"
      :detail="detail"
      :loading="detailLoading"
      :retrying="retrying"
      :exporting-ids="exportingIds"
      :deleting-ids="deletingIds"
      @refresh="loadDetail"
      @retry="handleRetry()"
      @view="openItemDialog($event, 'view')"
      @edit="openItemDialog($event, 'edit')"
      @export="handleExportMarkdown"
      @delete="handleDeleteItem"
    />

    <ContentItemFormDialog
      v-model="itemDialogVisible"
      :mode="itemDialogMode"
      :item="activeItem"
      :submitting="itemSubmitting"
      :error-message="itemError"
      @submit="handleItemSubmit"
    />
  </section>
</template>

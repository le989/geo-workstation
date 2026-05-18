<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh } from "@element-plus/icons-vue";
import {
  archiveContentTask,
  createContentTask,
  deleteContentItem,
  exportContentItem,
  formatContentItemForPublish,
  getContentTask,
  getContentTasks,
  optimizeContentItemForPublish,
  qualityCheckContentItem,
  retryContentTask,
  updateContentItem,
  type ContentQualityCheckResult,
  type ContentItem,
  type ContentTask,
  type ContentTaskDetail,
  type ContentTaskQuery,
  type CreateContentTaskPayload,
  type FormatContentItemForPublishPayload,
  type PublishFormatResult,
  type PublishOptimizationResult,
  type UpdateContentItemPayload
} from "@/api/content";
import AppErrorState from "@/components/AppErrorState.vue";
import ContentGenerationTypeTag from "@/components/ContentGenerationTypeTag.vue";
import ContentItemFormDialog from "@/components/ContentItemFormDialog.vue";
import ContentTaskDetailDrawer from "@/components/ContentTaskDetailDrawer.vue";
import ContentTaskFilters from "@/components/ContentTaskFilters.vue";
import ContentTaskFormDialog from "@/components/ContentTaskFormDialog.vue";
import ContentTaskStatusTag from "@/components/ContentTaskStatusTag.vue";
import { generationTypeLabelMap } from "@/config/content-options";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction } from "@/utils/permission";

const authStore = useAuthStore();
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
const archivingIds = ref<string[]>([]);

const itemDialogVisible = ref(false);
const itemDialogMode = ref<"view" | "edit">("view");
const activeItem = ref<ContentItem | null>(null);
const itemSubmitting = ref(false);
const itemError = ref("");
const exportingIds = ref<string[]>([]);
const deletingIds = ref<string[]>([]);
const qualityCheckingIds = ref<string[]>([]);
const optimizingIds = ref<string[]>([]);
const formattingIds = ref<string[]>([]);
const qualityCheckResult = ref<{
  itemId: string;
  itemTitle: string;
  result: ContentQualityCheckResult;
} | null>(null);
const qualityCheckError = ref("");
const publishOptimizationResult = ref<{
  itemId: string;
  itemTitle: string;
  result: PublishOptimizationResult;
} | null>(null);
const publishOptimizationError = ref("");
const publishFormatResult = ref<{
  itemId: string;
  itemTitle: string;
  result: PublishFormatResult;
} | null>(null);
const publishFormatError = ref("");

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && tasks.value.length === 0);
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canManageContentActions = computed(() => canUseAction("create", currentRole.value));
const selectedTaskArchiving = computed(() => archivingIds.value.includes(selectedTaskId.value));
const contentOverviewStats = computed(() => {
  const activeCount = tasks.value.filter((task) =>
    ["pending", "running"].includes(task.status)
  ).length;
  const succeededCount = tasks.value.filter((task) => task.status === "succeeded").length;
  const failedCount = tasks.value.filter((task) => task.status === "failed").length;

  return [
    { label: "当前列表任务", value: total.value, hint: "按当前筛选范围统计" },
    { label: "生成中 / 待执行", value: activeCount, hint: "需要继续关注进度" },
    { label: "已完成任务", value: succeededCount, hint: "可进入详情审校草稿" },
    { label: "待处理失败", value: failedCount, hint: "可查看原因后重试" }
  ];
});

const contentWorkflowSteps = [
  {
    title: "创建任务",
    description: "选择 GEO 词、知识库和指令"
  },
  {
    title: "生成内容",
    description: "生成问答、指南、对比或方案"
  },
  {
    title: "质量检查",
    description: "检查事实边界和 GEO 结构"
  },
  {
    title: "发布优化",
    description: "生成更稳妥的发布优化稿"
  },
  {
    title: "富文本稿",
    description: "准备 HTML / Markdown / 纯文本"
  },
  {
    title: "人工发布",
    description: "发布前人工确认事实与样式"
  }
];

const getTaskNextAction = (task: ContentTask) => {
  if (task.status === "failed") {
    return "查看失败原因 / 重试";
  }

  if (task.status === "running" || task.status === "pending") {
    return "刷新详情查看生成进度";
  }

  if (task.status === "cancelled") {
    return "查看任务记录";
  }

  return "进入详情做质检 / 发布优化";
};

const canArchiveContentTask = (task?: ContentTask | null) =>
  Boolean(
    task &&
      canManageContentActions.value &&
      task.status !== "running" &&
      task.status !== "cancelled"
  );
const isArchiving = (id: string) => archivingIds.value.includes(id);

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

const isTechnicalTaskName = (value: string) =>
  /\b(phase|smoke|mock|debug|test|batch)\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(value);

const getDisplayTaskName = (task: ContentTask) =>
  task.name && !isTechnicalTaskName(task.name) ? task.name : "GEO 内容生成任务";

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
  if (!canManageContentActions.value) {
    ElMessage.warning("当前账号仅可查看内容任务，不能创建内容。");
    return;
  }

  createError.value = "";
  createDialogVisible.value = true;
};

const openDetailDrawer = async (task: ContentTask) => {
  selectedTaskId.value = task.id;
  clearQualityReviewState();
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
    const failedItems = created.items.filter((item) => item.status === "failed");
    const firstFailureReason = failedItems.find((item) => item.errorMessage)?.errorMessage;

    if (created.task.status === "failed" || failedItems.length > 0) {
      const isRealAiTask = created.task.provider === "openai_compatible";
      const message = isRealAiTask
        ? "内容任务已创建，但真实 AI 生成失败，请查看失败原因。"
        : "内容任务已创建，但部分内容项生成失败，请查看失败原因。";
      ElMessage.warning({
        message: firstFailureReason ? `${message}${firstFailureReason}` : message,
        duration: 7000
      });
    } else {
      ElMessage.success("GEO 内容任务已创建，内容项已生成。");
    }

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

  if (!canManageContentActions.value) {
    ElMessage.warning("当前账号仅可查看内容任务，不能重试生成。");
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

const clearQualityReviewState = () => {
  qualityCheckResult.value = null;
  qualityCheckError.value = "";
  publishOptimizationResult.value = null;
  publishOptimizationError.value = "";
  publishFormatResult.value = null;
  publishFormatError.value = "";
};

const getReviewProviderPayload = () => ({
  provider: detail.value?.task.provider ?? "mock",
  model: detail.value?.task.model
});

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

const handleQualityCheck = async (item: ContentItem) => {
  qualityCheckError.value = "";

  try {
    await withIdFlag(qualityCheckingIds, item.id, async () => {
      const result = await qualityCheckContentItem(item.id, {
        ...getReviewProviderPayload(),
        checkMode: "standard"
      });
      qualityCheckResult.value = {
        itemId: item.id,
        itemTitle: item.title,
        result
      };
    });

    ElMessage.success("内容质量检查完成。");
  } catch (error) {
    qualityCheckError.value =
      error instanceof Error ? error.message : "内容质量检查失败，请稍后重试或调整生成方式。";
    ElMessage.error(qualityCheckError.value);
  }
};

const handleOptimizeForPublish = async (item: ContentItem) => {
  publishOptimizationError.value = "";

  try {
    await withIdFlag(optimizingIds, item.id, async () => {
      const result = await optimizeContentItemForPublish(item.id, {
        ...getReviewProviderPayload(),
        targetChannel: "官网文章",
        optimizationGoal: "更稳妥、更适合 GEO 抓取、减少参数风险"
      });
      publishOptimizationResult.value = {
        itemId: item.id,
        itemTitle: item.title,
        result
      };
    });

    ElMessage.success("发布优化版已生成，原内容项未被覆盖。");
  } catch (error) {
    publishOptimizationError.value =
      error instanceof Error ? error.message : "生成发布优化版失败，请稍后重试或调整生成方式。";
    ElMessage.error(publishOptimizationError.value);
  }
};

const handleFormatForPublish = async (
  item: ContentItem,
  payload: FormatContentItemForPublishPayload
) => {
  publishFormatError.value = "";

  try {
    await withIdFlag(formattingIds, item.id, async () => {
      const result = await formatContentItemForPublish(item.id, payload);
      publishFormatResult.value = {
        itemId: item.id,
        itemTitle: item.title,
        result
      };
    });

    ElMessage.success("富文本发布稿已生成，原内容项未被覆盖。");
  } catch (error) {
    publishFormatError.value =
      error instanceof Error ? error.message : "生成富文本发布稿失败，请稍后重试。";
    ElMessage.error(publishFormatError.value);
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

const handleArchiveTask = async (task?: ContentTask) => {
  const targetTask = task ?? detail.value?.task ?? null;
  const targetTaskId = targetTask?.id ?? selectedTaskId.value;

  if (!targetTaskId) {
    return;
  }

  if (!canManageContentActions.value) {
    ElMessage.warning("当前账号仅可查看内容任务，不能归档任务。");
    return;
  }

  if (targetTask?.status === "running") {
    ElMessage.warning("生成中的 GEO 内容任务暂不能归档。");
    return;
  }

  if (targetTask?.status === "cancelled") {
    ElMessage.info("该 GEO 内容任务已归档。");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "归档后，该 GEO 内容任务将从默认列表隐藏，已生成的内容项和导出能力仍会保留。",
      "归档 GEO 内容任务",
      {
        cancelButtonText: "暂不归档",
        confirmButtonText: "归档任务",
        type: "warning"
      }
    );

    await withIdFlag(archivingIds, targetTaskId, async () => {
      await archiveContentTask(targetTaskId);
    });
    ElMessage.success("GEO 内容任务已归档。");
    await loadTasks();
    if (selectedTaskId.value === targetTaskId) {
      await loadDetail();
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "归档 GEO 内容任务失败。");
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
      <div class="content-hero__copy">
        <el-tag class="content-hero__tag" type="success" effect="plain">GEO 内容生产</el-tag>
        <h1>GEO 内容生成</h1>
        <p>
          提示词决定用户会问什么，知识库提供事实资料，指令模板定义写法，内容任务生成可审校和导出的 GEO 草稿。
        </p>
        <div class="content-hero__signals">
          <span>提示词 / 知识库 / 指令模板</span>
          <span>创建内容任务</span>
          <span>生成草稿并人工审校</span>
        </div>
      </div>
      <div class="content-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button text :icon="Refresh" :loading="loading" @click="loadTasks">刷新列表</el-button>
        <el-button
          v-if="canManageContentActions"
          type="primary"
          :icon="Plus"
          @click="openCreateDialog"
        >
          创建内容任务
        </el-button>
      </div>
    </header>

    <el-alert
      title="内容任务会结合提示词、知识库和指令模板生成可审校草稿；正式发布前仍需人工确认事实、语气和样式。"
      type="info"
      :closable="false"
      show-icon
      class="content-boundary-alert"
    />

    <el-collapse class="content-workflow-collapse">
      <el-collapse-item title="查看内容生产流程" name="workflow">
        <section class="content-workflow-panel" aria-label="内容生产流程概览">
          <div class="content-workflow-panel__header">
            <div>
              <p class="section-kicker">内容生产流程</p>
              <h2>提示词 / 知识库 / 指令模板 → 创建内容任务 → 生成草稿 → 导出或归档</h2>
            </div>
            <span>流程提示默认收起，避免遮挡任务列表。</span>
          </div>
          <div class="content-workflow-strip">
            <article
              v-for="(step, index) in contentWorkflowSteps"
              :key="step.title"
              class="content-workflow-card"
            >
              <span>{{ String(index + 1).padStart(2, "0") }}</span>
              <strong>{{ step.title }}</strong>
              <small>{{ step.description }}</small>
            </article>
          </div>
        </section>
      </el-collapse-item>
    </el-collapse>

    <section class="content-overview-strip" aria-label="当前列表概览">
      <article v-for="item in contentOverviewStats" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </article>
    </section>

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
            <p class="section-kicker">内容任务</p>
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
        <el-table-column label="内容任务" min-width="280" fixed>
          <template #default="{ row }">
            <strong class="content-task-title">{{ getDisplayTaskName(row) }}</strong>
            <p class="table-subtext">产品线：{{ formatOptional(row.productLine) }}</p>
          </template>
        </el-table-column>
        <el-table-column label="内容类型" width="150">
          <template #default="{ row }">
            <ContentGenerationTypeTag :type="row.generationType" />
          </template>
        </el-table-column>
        <el-table-column label="任务状态" width="110">
          <template #default="{ row }">
            <ContentTaskStatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="草稿 / 内容数量" min-width="150">
          <span class="content-provider-model">进入详情查看</span>
        </el-table-column>
        <el-table-column label="下一步" min-width="210">
          <template #default="{ row }">
            <div class="content-next-action">
              <span>{{ generationTypeLabelMap[row.generationType] ?? row.generationType }}</span>
              <strong>{{ getTaskNextAction(row) }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openDetailDrawer(row)">查看详情</el-button>
            <el-button
              v-if="row.status === 'failed' && canManageContentActions"
              text
              type="warning"
              :loading="retrying && selectedTaskId === row.id"
              @click="handleRetry(row)"
            >
              重试
            </el-button>
            <el-button
              v-if="canArchiveContentTask(row)"
              text
              :loading="isArchiving(row.id)"
              @click="handleArchiveTask(row)"
            >
              归档
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
      :archiving="selectedTaskArchiving"
      :exporting-ids="exportingIds"
      :deleting-ids="deletingIds"
      :quality-checking-ids="qualityCheckingIds"
      :optimizing-ids="optimizingIds"
      :formatting-ids="formattingIds"
      :quality-check-result="qualityCheckResult"
      :quality-check-error="qualityCheckError"
      :publish-optimization-result="publishOptimizationResult"
      :publish-optimization-error="publishOptimizationError"
      :publish-format-result="publishFormatResult"
      :publish-format-error="publishFormatError"
      :can-manage-actions="canManageContentActions"
      @refresh="loadDetail"
      @retry="handleRetry()"
      @archive="handleArchiveTask()"
      @view="openItemDialog($event, 'view')"
      @edit="openItemDialog($event, 'edit')"
      @export="handleExportMarkdown"
      @delete="handleDeleteItem"
      @quality-check="handleQualityCheck"
      @optimize="handleOptimizeForPublish"
      @format-publish="handleFormatForPublish"
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

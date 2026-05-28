<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { DocumentCopy, MagicStick, MoreFilled, Plus, Refresh, View } from "@element-plus/icons-vue";
import {
  archiveContentTask,
  createContentTask,
  deleteContentItem,
  exportContentItem,
  exportContentItemPublishPackage,
  fixRiskWordsAndRecheckContentItem,
  formatContentItemForPublish,
  generateContentItemPublishPackage,
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
import ContentItemFormDialog from "@/components/ContentItemFormDialog.vue";
import ContentTaskDetailDrawer from "@/components/ContentTaskDetailDrawer.vue";
import ContentTaskFilters from "@/components/ContentTaskFilters.vue";
import ContentTaskFormDialog from "@/components/ContentTaskFormDialog.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction } from "@/utils/permission";

const authStore = useAuthStore();
type PublishPackageExportAction = "review-markdown" | "publish-markdown" | "package-txt";
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
const riskFixingIds = ref<string[]>([]);
const optimizingIds = ref<string[]>([]);
const formattingIds = ref<string[]>([]);
const publishPackageGeneratingIds = ref<string[]>([]);
const publishPackageExportingIds = ref<string[]>([]);
const publishPreviewLoadingIds = ref<string[]>([]);
const publishPreviewMarkdownByItemId = ref<Record<string, string>>({});
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

type AssistantArticleStatus = "pending" | "running" | "copyable" | "needs_review";

const assistantStatusLabelMap: Record<AssistantArticleStatus, string> = {
  copyable: "可复制",
  needs_review: "需人工检查",
  pending: "待处理",
  running: "生成中"
};

const activeAssistantStatus = ref<AssistantArticleStatus | "all">("all");
const hasTableError = computed(() => Boolean(tableError.value));
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canManageContentActions = computed(() => canUseAction("create", currentRole.value));
const selectedTaskArchiving = computed(() => archivingIds.value.includes(selectedTaskId.value));
const contentOverviewStats = computed(() => {
  const pendingCount = tasks.value.filter((task) => resolveAssistantStatus(task) === "pending").length;
  const runningCount = tasks.value.filter((task) => resolveAssistantStatus(task) === "running").length;
  const copyableCount = tasks.value.filter((task) => resolveAssistantStatus(task) === "copyable").length;
  const reviewCount = tasks.value.filter(
    (task) => resolveAssistantStatus(task) === "needs_review"
  ).length;

  return [
    { label: "待处理", value: pendingCount, hint: "还没有生成文章" },
    { label: "生成中", value: runningCount, hint: "文章正在生成" },
    { label: "可复制", value: copyableCount, hint: "发布检查已通过" },
    { label: "需人工检查", value: reviewCount, hint: "存在风险词或需检查" }
  ];
});
const assistantStatusTabs = computed(() => [
  { label: "全部", status: "all" as const, value: tasks.value.length },
  { label: "待处理", status: "pending" as const, value: contentOverviewStats.value[0]?.value ?? 0 },
  { label: "生成中", status: "running" as const, value: contentOverviewStats.value[1]?.value ?? 0 },
  { label: "可复制", status: "copyable" as const, value: contentOverviewStats.value[2]?.value ?? 0 },
  {
    label: "需人工检查",
    status: "needs_review" as const,
    value: contentOverviewStats.value[3]?.value ?? 0
  }
]);
const visibleAssistantTasks = computed(() => {
  if (activeAssistantStatus.value === "all") {
    return tasks.value;
  }

  return tasks.value.filter((task) => resolveAssistantStatus(task) === activeAssistantStatus.value);
});

const contentWorkflowSteps = [
  {
    title: "创建任务",
    description: "选择资料并填写文章主题"
  },
  {
    title: "生成内容",
    description: "生成问答、指南、对比或方案"
  },
  {
    title: "发布检查",
    description: "检查事实边界和风险词"
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

const getPrimaryItem = (task: ContentTask) => task.primaryItem;

const resolveAssistantStatus = (task: ContentTask): AssistantArticleStatus => {
  const primaryItem = getPrimaryItem(task);
  const publishStatus = primaryItem?.publishStatus;

  if (task.status === "pending" || (!primaryItem && task.status !== "running")) {
    return "pending";
  }

  if (task.status === "running") {
    return "running";
  }

  if (publishStatus === "publish_ready") {
    return "copyable";
  }

  return "needs_review";
};

const getTaskNextAction = (task: ContentTask) => {
  const status = resolveAssistantStatus(task);

  if (status === "pending") {
    return "还没有生成文章";
  }

  if (status === "running") {
    return "文章正在生成，请稍后";
  }

  if (status === "copyable") {
    return "已通过检查，可以复制";
  }

  return "发现问题，先修复或人工修改";
};

const getAssistantStatusTagType = (task: ContentTask) => {
  const status = resolveAssistantStatus(task);

  if (status === "copyable") {
    return "success";
  }

  if (status === "needs_review") {
    return "warning";
  }

  if (status === "running") {
    return "primary";
  }

  return "info";
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

const cleanAssistantTaskName = (value?: string) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  const withoutColonPrefix = trimmed.replace(/^ASSISTANT[-_][^:：]*[:：]\s*/i, "").trim();
  const taskName = withoutColonPrefix || trimmed;

  // 列表主标题不展示 smoke 前缀，避免助理把内部测试标识当成文章标题。
  if (/^ASSISTANT[-_]/i.test(taskName)) {
    const taskNameParts = taskName.split("_");
    const readablePartIndex = taskNameParts.findIndex((part) => /[\u4e00-\u9fff]/.test(part));

    if (readablePartIndex > 0) {
      return taskNameParts.slice(readablePartIndex).join("_").trim();
    }

    return "";
  }

  return isTechnicalTaskName(taskName) ? "" : taskName;
};

const getAssistantArticleTitle = (task: ContentTask) =>
  task.primaryItem?.title?.trim() || cleanAssistantTaskName(task.name) || "文章任务";

const isRealAiProvider = (provider?: string) => provider && provider !== "mock";

const confirmRealAiTaskAction = async (
  task: ContentTask | undefined | null,
  actionLabel: string,
  confirmButtonText: string
) => {
  if (!isRealAiProvider(task?.provider)) {
    return true;
  }

  try {
    await ElMessageBox.confirm(
      `${actionLabel}将调用外部 AI 模型，可能产生额度消耗。系统会发送当前任务资料范围内的知识片段，并继续排除待审核、低可靠、暂不可引用资料；确认后才继续。`,
      `确认${actionLabel}`,
      {
        cancelButtonText: "取消",
        confirmButtonText,
        type: "warning"
      }
    );
    return true;
  } catch {
    return false;
  }
};

const getTaskKnowledgeScopeSummary = (task: ContentTask) => {
  const scope = task.knowledgeScope;

  if (scope?.type === "selected_files") {
    return `指定资料：${scope.selectedKnowledgeFileIds.length} 份`;
  }

  if (scope?.type === "product_line") {
    return `按产品线：${formatOptional(task.productLine)}`;
  }

  return "全部可引用资料";
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

const isPreviewableContentItem = (item: ContentItem) =>
  Boolean(item.title.trim() || item.body.trim()) &&
  item.status !== "failed" &&
  item.status !== "cancelled";

const loadPublishPreviewMarkdown = async (items: ContentItem[]) => {
  const previewableItems = items.filter(isPreviewableContentItem);
  publishPreviewMarkdownByItemId.value = {};

  if (previewableItems.length === 0) {
    publishPreviewLoadingIds.value = [];
    return;
  }

  publishPreviewLoadingIds.value = previewableItems.map((item) => item.id);

  // 详情页发布稿预览复用复制富文本的后端导出，确保“看到的”和“复制的”一致。
  const previewEntries = await Promise.all(
    previewableItems.map(async (item) => {
      try {
        const markdown = await exportContentItem(item.id, {
          type: "publish",
          format: "markdown"
        });
        return [item.id, markdown] as const;
      } catch {
        return [item.id, ""] as const;
      }
    })
  );

  publishPreviewMarkdownByItemId.value = Object.fromEntries(previewEntries);
  publishPreviewLoadingIds.value = [];
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
    ElMessage.warning("当前账号仅可查看文章任务，不能创建文章。");
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
    const loadedDetail = await getContentTask(selectedTaskId.value);
    detail.value = loadedDetail;
    await loadPublishPreviewMarkdown(loadedDetail.items);
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    detail.value = null;
    publishPreviewMarkdownByItemId.value = {};
    publishPreviewLoadingIds.value = [];
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
        ? "文章任务已创建，但真实 AI 生成失败，请查看失败原因。"
        : "文章任务已创建，但部分文章内容生成失败，请查看失败原因。";
      ElMessage.warning({
        message: firstFailureReason ? `${message}${firstFailureReason}` : message,
        duration: 7000
      });
    } else {
      ElMessage.success("文章任务已创建，文章内容已生成。");
    }

    await loadTasks();
    selectedTaskId.value = created.task.id;
    detail.value = created;
    await loadPublishPreviewMarkdown(created.items);
    detailVisible.value = true;
  } catch (error) {
    createError.value = error instanceof Error ? error.message : "创建文章任务失败。";
  } finally {
    createSubmitting.value = false;
  }
};

const handleRetry = async (task?: ContentTask) => {
  const targetTaskId = task?.id ?? selectedTaskId.value;
  const targetTask = task ?? detail.value?.task;

  if (!targetTaskId) {
    return;
  }

  if (!canManageContentActions.value) {
    ElMessage.warning("当前账号仅可查看文章任务，不能重试生成。");
    return;
  }

  try {
    if (isRealAiProvider(targetTask?.provider)) {
      if (!(await confirmRealAiTaskAction(targetTask, "重试生成", "确认重试"))) {
        return;
      }
    } else {
      await ElMessageBox.confirm(
        "确认重试失败文章任务吗？重试不会重复生成已成功文章。",
        "重试文章任务",
        {
          cancelButtonText: "取消",
          confirmButtonText: "重试",
          type: "warning"
        }
      );
    }

    retrying.value = true;
    const result = await retryContentTask(targetTaskId);
    detail.value = result;
    selectedTaskId.value = result.task.id;
    await loadPublishPreviewMarkdown(result.items);
    detailVisible.value = true;
    ElMessage.success("已重试失败文章。");
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
    ElMessage.success("文章内容已更新。");
    await loadDetail();
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : "文章内容保存失败。";
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

const downloadTextFile = (fileName: string, content: string, mimeType: string) => {
  const blob = new Blob([content], {
    type: mimeType
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadMarkdown = (item: ContentItem, markdown: string) => {
  downloadTextFile(`content-item-${item.id}.md`, markdown, "text/markdown;charset=utf-8");
};

const handleExportMarkdown = async (item: ContentItem) => {
  try {
    await withIdFlag(exportingIds, item.id, async () => {
      const markdown = await exportContentItem(item.id, {
        type: "review",
        format: "markdown"
      });
      downloadMarkdown(item, markdown);
    });
    ElMessage.success("评审稿 Markdown 已导出。");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "评审稿导出失败。");
  }
};

const handleGeneratePublishPackage = async (item: ContentItem) => {
  try {
    await withIdFlag(publishPackageGeneratingIds, item.id, async () => {
      await generateContentItemPublishPackage(item.id);
      await loadDetail();
    });
    ElMessage.success("发布稿已生成。");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "发布稿生成失败。");
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inlineMarkdownToHtml = (value: string) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const markdownToPublishHtml = (markdown: string) => {
  const htmlLines = markdown.split("\n").map((line) => {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);

    if (heading) {
      const level = Math.min(heading[1]?.length ?? 2, 3);
      return `<h${level}>${inlineMarkdownToHtml(heading[2] ?? "")}</h${level}>`;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);

    if (listItem) {
      return `<p>• ${inlineMarkdownToHtml(listItem[1] ?? "")}</p>`;
    }

    return line.trim() ? `<p>${inlineMarkdownToHtml(line)}</p>` : "";
  });

  return `<article>${htmlLines.join("\n")}</article>`;
};

const writePublishClipboard = async (markdown: string) => {
  const clipboard = navigator.clipboard;
  const clipboardItem = typeof ClipboardItem === "undefined" ? undefined : ClipboardItem;

  if (clipboard?.write && clipboardItem) {
    await clipboard.write([
      new clipboardItem({
        "text/html": new Blob([markdownToPublishHtml(markdown)], {
          type: "text/html"
        }),
        "text/plain": new Blob([markdown], {
          type: "text/plain"
        })
      })
    ]);
    return "rich";
  }

  await clipboard.writeText(markdown);
  return "plain";
};

const handleCopyPublishPackage = async (item: Pick<ContentItem, "id">) => {
  try {
    await withIdFlag(publishPackageExportingIds, item.id, async () => {
      // 复制发布稿直接复用后端干净导出，避免历史发布稿标题污染剪贴板。
      const markdown = await exportContentItem(item.id, {
        type: "publish",
        format: "markdown"
      });
      await writePublishClipboard(markdown);
    });
    ElMessage.success("复制成功，可以粘贴到发布平台。");
  } catch (error) {
    ElMessage.warning(
      error instanceof Error
        ? error.message
        : "当前浏览器不支持富文本剪贴板，请导出发布稿后手动复制。"
    );
  }
};

const handleCopyDraftForEdit = async (task: ContentTask) => {
  const primaryItem = getPrimaryItem(task);

  if (!primaryItem) {
    ElMessage.warning("当前文章还没有可复制的草稿。");
    return;
  }

  try {
    await withIdFlag(publishPackageExportingIds, primaryItem.id, async () => {
      const markdown = await exportContentItem(primaryItem.id, {
        type: "publish",
        format: "markdown"
      });
      await navigator.clipboard.writeText(markdown);
    });
    ElMessage.success("草稿已复制，请先人工修改后再发布。");
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : "草稿复制失败，请打开文章后手动复制。");
  }
};

const handleCopyDraftForEditItem = async (item: Pick<ContentItem, "id">) => {
  try {
    await withIdFlag(publishPackageExportingIds, item.id, async () => {
      // 有风险的文章只能复制为草稿，避免助理误认为已经可发布。
      const markdown = await exportContentItem(item.id, {
        type: "publish",
        format: "markdown"
      });
      await navigator.clipboard.writeText(markdown);
    });
    ElMessage.success("草稿已复制，请先人工修改后再发布。");
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : "草稿复制失败，请打开文章后手动复制。");
  }
};

const handleAutoFixRiskWords = async (task: ContentTask) => {
  const primaryItem = getPrimaryItem(task);

  if (!primaryItem) {
    ElMessage.warning("当前文章还没有可修复的正文。");
    return;
  }

  try {
    await withIdFlag(riskFixingIds, primaryItem.id, async () => {
      await fixRiskWordsAndRecheckContentItem(primaryItem.id);
    });
    ElMessage.success("风险词已按规则修复，并已重新执行发布检查。");
    await loadTasks();
    if (detailVisible.value && selectedTaskId.value === task.id) {
      await loadDetail();
    }
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : "自动修复风险词失败，请人工检查。");
  }
};

const handleAutoFixRiskWordsForItem = async (item: ContentItem) => {
  try {
    await withIdFlag(riskFixingIds, item.id, async () => {
      await fixRiskWordsAndRecheckContentItem(item.id);
    });
    ElMessage.success("风险词已按规则修复，并已重新执行发布检查。");
    await Promise.all([loadTasks(), loadDetail()]);
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : "自动修复风险词失败，请人工检查。");
  }
};

const handleRegenerateTask = async (task?: ContentTask) => {
  const targetTask = task ?? detail.value?.task;

  if (!targetTask) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "重新生成会消耗 AI token / 额度；当前 smoke 验证使用基础生成模式时不会调用真实 AI。确认后会新建一条同主题文章任务。",
      "重新生成文章",
      {
        cancelButtonText: "取消",
        confirmButtonText: "重新生成",
        type: "warning"
      }
    );

    const scope = targetTask.knowledgeScope;
    const provider = targetTask.provider ?? "mock";
    const created = await createContentTask({
      generationType: targetTask.generationType || "article",
      geoPromptIds: [],
      knowledgeBaseId: targetTask.knowledgeBaseId ?? undefined,
      model: targetTask.model,
      name: targetTask.name,
      productLine: targetTask.productLine,
      productLineId: targetTask.productLineId,
      provider,
      scopeType: scope?.type ?? "all",
      selectedKnowledgeFileIds:
        scope?.type === "selected_files" ? scope.selectedKnowledgeFileIds : undefined,
      targetModel: targetTask.targetModel
    });
    ElMessage.success("已重新生成文章任务。");
    await loadTasks();
    selectedTaskId.value = created.task.id;
    detail.value = created;
    await loadPublishPreviewMarkdown(created.items);
    detailVisible.value = true;
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "重新生成文章失败。");
    }
  }
};

const handleExportPublishPackage = async (
  item: ContentItem,
  action: PublishPackageExportAction
) => {
  try {
    await withIdFlag(publishPackageExportingIds, item.id, async () => {
      const isPackageTxt = action === "package-txt";
      const content = isPackageTxt
        ? await exportContentItemPublishPackage(item.id, "txt")
        : await exportContentItem(item.id, {
            type: action === "review-markdown" ? "review" : "publish",
            format: "markdown"
          });
      const extension = isPackageTxt ? "txt" : "md";
      const fileNamePrefix =
        action === "review-markdown"
          ? "content-review"
          : action === "publish-markdown"
            ? "content-publish"
            : "publish-package";
      downloadTextFile(
        `${fileNamePrefix}-${item.id}.${extension}`,
        content,
        isPackageTxt ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8"
      );
    });
    ElMessage.success(
      action === "review-markdown"
        ? "评审稿已导出。"
        : action === "publish-markdown"
          ? "发布稿已导出。"
          : "TXT 发布稿已导出。"
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "导出失败。");
  }
};

const handleQualityCheck = async (item: ContentItem) => {
  qualityCheckError.value = "";

  try {
    if (!(await confirmRealAiTaskAction(detail.value?.task, "发布检查", "确认检查"))) {
      return;
    }

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
      await loadDetail();
    });

    ElMessage.success("发布检查完成。");
  } catch (error) {
    qualityCheckError.value =
      error instanceof Error ? error.message : "发布检查失败，请稍后重试或调整生成方式。";
    ElMessage.error(qualityCheckError.value);
  }
};

const handleOptimizeForPublish = async (item: ContentItem) => {
  publishOptimizationError.value = "";

  try {
    if (!(await confirmRealAiTaskAction(detail.value?.task, "生成发布优化版", "确认生成"))) {
      return;
    }

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

    ElMessage.success("发布优化版已生成，原文章未被覆盖。");
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

    ElMessage.success("富文本发布稿已生成，原文章未被覆盖。");
  } catch (error) {
    publishFormatError.value =
      error instanceof Error ? error.message : "生成富文本发布稿失败，请稍后重试。";
    ElMessage.error(publishFormatError.value);
  }
};

const handleDeleteItem = async (item: ContentItem) => {
  try {
    await ElMessageBox.confirm(`确认移除该文章内容吗？\n${item.title}`, "删除文章内容", {
      cancelButtonText: "取消",
      confirmButtonText: "移除",
      type: "warning"
    });

    await withIdFlag(deletingIds, item.id, async () => {
      await deleteContentItem(item.id);
    });
    ElMessage.success("已移除该文章内容。");
    await Promise.all([loadDetail(), loadTasks()]);
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除文章内容失败。");
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
    ElMessage.warning("当前账号仅可查看文章任务，不能归档任务。");
    return;
  }

  if (targetTask?.status === "running") {
    ElMessage.warning("生成中的文章任务暂不能归档。");
    return;
  }

  if (targetTask?.status === "cancelled") {
    ElMessage.info("该文章任务已归档。");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "归档后，该文章任务将从默认列表隐藏，已生成的文章和导出能力仍会保留。",
      "归档文章任务",
      {
        cancelButtonText: "暂不归档",
        confirmButtonText: "归档任务",
        type: "warning"
      }
    );

    await withIdFlag(archivingIds, targetTaskId, async () => {
      await archiveContentTask(targetTaskId);
    });
    ElMessage.success("文章任务已归档。");
    await loadTasks();
    if (selectedTaskId.value === targetTaskId) {
      await loadDetail();
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "归档文章任务失败。");
    }
  }
};

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <section class="content-page">
    <header class="content-hero content-hero--compact">
      <div class="content-hero__copy">
        <h1>发布文章工作台</h1>
        <p>每天只需要 3 步：1. 选择资料 2. 生成文章 3. 通过检查后复制发布稿</p>
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
          新建发布文章
        </el-button>
      </div>
    </header>

    <p class="content-inline-note">
      助理只需生成文章、检查结果并复制发布稿；高级配置由负责人维护。
    </p>

    <ContentTaskFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
    />

    <AppErrorState v-if="hasTableError" title="文章任务加载失败" :message="tableError" />

    <el-card class="content-table-card article-workbench-list" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">文章工作台</p>
            <h2>待处理文章列表</h2>
            <span>按状态处理下一步，历史和高级操作收在更多里。</span>
          </div>
          <strong>{{ total }} 篇文章</strong>
        </div>
      </template>

      <nav class="assistant-status-tabs" aria-label="文章状态筛选">
        <button
          v-for="tab in assistantStatusTabs"
          :key="tab.status"
          type="button"
          :class="{ 'is-active': activeAssistantStatus === tab.status }"
          @click="activeAssistantStatus = tab.status"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tab.value }}</strong>
        </button>
      </nav>

      <section v-loading="loading" class="assistant-article-list">
        <article
          v-for="row in visibleAssistantTasks"
          :key="row.id"
          class="assistant-article-card"
          :class="`assistant-article-card--${resolveAssistantStatus(row)}`"
        >
          <div class="assistant-article-card__content">
            <div class="assistant-article-card__meta">
              <el-tag :type="getAssistantStatusTagType(row)" effect="plain">
                {{ assistantStatusLabelMap[resolveAssistantStatus(row)] }}
              </el-tag>
              <span>更新于 {{ formatDateTime(row.updatedAt) }}</span>
            </div>
            <h3>{{ getAssistantArticleTitle(row) }}</h3>
            <p class="assistant-article-card__source">
              使用资料：{{ getTaskKnowledgeScopeSummary(row) }}
            </p>
            <div class="assistant-article-card__next">
              <span>下一步</span>
              <strong>{{ getTaskNextAction(row) }}</strong>
            </div>
          </div>

          <div class="assistant-article-card__actions">
            <el-button
              v-if="resolveAssistantStatus(row) === 'pending'"
              type="primary"
              :icon="MagicStick"
              @click="handleRegenerateTask(row)"
            >
              生成文章
            </el-button>
            <el-button
              v-else-if="resolveAssistantStatus(row) === 'running'"
              type="primary"
              loading
              disabled
            >
              生成中
            </el-button>
            <el-button
              v-else-if="resolveAssistantStatus(row) === 'copyable' && row.primaryItem"
              type="success"
              :icon="DocumentCopy"
              :loading="publishPackageExportingIds.includes(row.primaryItem.id)"
              @click="handleCopyPublishPackage(row.primaryItem)"
            >
              复制富文本
            </el-button>
            <el-button
              v-else-if="row.primaryItem"
              type="warning"
              :icon="MagicStick"
              :loading="riskFixingIds.includes(row.primaryItem.id)"
              @click="handleAutoFixRiskWords(row)"
            >
              自动修复
            </el-button>
            <el-button
              v-if="resolveAssistantStatus(row) === 'copyable' || resolveAssistantStatus(row) === 'needs_review'"
              plain
              :icon="View"
              @click="openDetailDrawer(row)"
            >
              打开文章
            </el-button>
            <el-dropdown
              v-if="
                canArchiveContentTask(row) ||
                  (resolveAssistantStatus(row) === 'needs_review' && row.primaryItem)
              "
              class="assistant-card-more"
              trigger="click"
            >
              <el-button text :icon="MoreFilled">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="resolveAssistantStatus(row) === 'needs_review' && row.primaryItem"
                    :disabled="publishPackageExportingIds.includes(row.primaryItem.id)"
                    @click="handleCopyDraftForEdit(row)"
                  >
                    复制草稿继续修改
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="resolveAssistantStatus(row) === 'needs_review' && canManageContentActions"
                    @click="handleRegenerateTask(row)"
                  >
                    重新生成文章
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canArchiveContentTask(row)"
                    :disabled="isArchiving(row.id)"
                    @click="handleArchiveTask(row)"
                  >
                    归档
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </article>

        <el-empty
          v-if="!loading && visibleAssistantTasks.length === 0 && !hasTableError"
          description="暂无匹配文章，请调整筛选或新建发布文章。"
        />
      </section>

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

    <el-collapse class="content-workflow-collapse content-workflow-collapse--secondary">
      <el-collapse-item title="任务状态和内容生产流程说明" name="workflow">
        <section class="content-workflow-panel" aria-label="内容生产流程概览">
          <div class="content-workflow-panel__header">
            <div>
              <p class="section-kicker">高级流程</p>
              <h2>选择资料 → 创建文章任务 → 生成文章 → 发布检查 → 复制或归档</h2>
            </div>
            <span>用于排查状态和理解流程，默认收起。</span>
          </div>
          <section class="content-overview-strip" aria-label="当前列表概览">
            <article v-for="item in contentOverviewStats" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.hint }}</small>
            </article>
          </section>
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
      :risk-fixing-ids="riskFixingIds"
      :optimizing-ids="optimizingIds"
      :formatting-ids="formattingIds"
      :publish-package-generating-ids="publishPackageGeneratingIds"
      :publish-package-exporting-ids="publishPackageExportingIds"
      :publish-preview-loading-ids="publishPreviewLoadingIds"
      :publish-preview-markdown-by-item-id="publishPreviewMarkdownByItemId"
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
      @fix-risk-words="handleAutoFixRiskWordsForItem"
      @copy-draft="handleCopyDraftForEditItem"
      @regenerate="handleRegenerateTask"
      @optimize="handleOptimizeForPublish"
      @format-publish="handleFormatForPublish"
      @generate-publish-package="handleGeneratePublishPackage"
      @copy-publish-package="handleCopyPublishPackage"
      @export-publish-package="handleExportPublishPackage"
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

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh } from "@element-plus/icons-vue";
import {
  archiveGeoAnalysisTask,
  convertAnalysisPrompts,
  createAnalysisContentTask,
  createGeoAnalysisTask,
  getGeoAnalysisTask,
  getGeoAnalysisTasks,
  runGeoAnalysisTask,
  updateGeoAnalysisTask,
  type ConvertAnalysisPromptsPayload,
  type ConvertAnalysisPromptsResult,
  type CreateAnalysisContentTaskPayload,
  type CreateGeoAnalysisTaskPayload,
  type GeoAnalysisTask,
  type GeoAnalysisTaskDetail,
  type GeoAnalysisTaskQuery,
  type UpdateGeoAnalysisTaskPayload
} from "@/api/geo-analysis";
import AppErrorState from "@/components/AppErrorState.vue";
import GeoAnalysisStatusTag from "@/components/GeoAnalysisStatusTag.vue";
import GeoAnalysisTaskDetailDrawer from "@/components/GeoAnalysisTaskDetailDrawer.vue";
import GeoAnalysisTaskFilters from "@/components/GeoAnalysisTaskFilters.vue";
import GeoAnalysisTaskFormDialog from "@/components/GeoAnalysisTaskFormDialog.vue";
import {
  formatGeoAnalysisDisplayText,
  formatGeoAnalysisTaskTitle,
  formatTargetModelNames
} from "@/config/geo-analysis-options";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction } from "@/utils/permission";

const router = useRouter();
const authStore = useAuthStore();

const tasks = ref<GeoAnalysisTask[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const tableError = ref("");
const lastLoadedAt = ref("");

const filters = reactive<GeoAnalysisTaskQuery>({
  page: 1,
  pageSize: 20
});

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const formSubmitting = ref(false);
const formError = ref("");
const editingTask = ref<GeoAnalysisTask | null>(null);

const detailVisible = ref(false);
const detailLoading = ref(false);
const selectedTaskId = ref("");
const detail = ref<GeoAnalysisTaskDetail | null>(null);
const running = ref(false);
const archivingIds = ref<string[]>([]);

const convertSubmitting = ref(false);
const convertResult = ref<ConvertAnalysisPromptsResult | null>(null);
const convertError = ref("");

const contentTaskSubmitting = ref(false);
const contentTaskError = ref("");

const diagnosisFlowSteps = [
  "GEO 诊断",
  "提示词策略",
  "知识库补齐",
  "内容生成",
  "模型覆盖记录",
  "GEO 报表复盘"
];

const diagnosisRelationLinks = [
  { label: "去提示词策略库", path: "/geo-prompts" },
  { label: "去知识库", path: "/knowledge-bases" },
  { label: "去内容生成", path: "/geo-content" },
  { label: "去模型覆盖记录", path: "/model-inclusion-records" },
  { label: "去 GEO 报表", path: "/geo-reports" }
];

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && tasks.value.length === 0);
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canManageAnalysisActions = computed(() => canUseAction("run", currentRole.value));
const selectedTaskArchiving = computed(() => archivingIds.value.includes(selectedTaskId.value));
const analysisMetricCards = computed(() => {
  const promptSuggestionCount = tasks.value.reduce(
    (sum, task) => sum + task.promptSuggestions.length,
    0
  );
  const completedCount = tasks.value.filter((task) => task.status === "succeeded").length;
  const actionCount = tasks.value.filter((task) =>
    ["pending", "failed", "running"].includes(task.status)
  ).length;

  return [
    {
      label: "诊断任务数",
      value: total.value,
      hint: "当前筛选下任务总量"
    },
    {
      label: "可转入优化项",
      value: promptSuggestionCount,
      hint: "当前页提示词建议"
    },
    {
      label: "已完成任务",
      value: completedCount,
      hint: "可进入补词 / 补资料"
    },
    {
      label: "待运行任务",
      value: actionCount,
      hint: "待运行、失败或进行中"
    }
  ];
});

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

// 只把已有任务字段整理成列表摘要，不改变诊断任务状态和运行逻辑。
const getTaskAssetSummary = (task: GeoAnalysisTask) => {
  const segments = [
    `品牌：${task.brandName}`,
    `官网：${formatOptional(task.websiteUrl)}`,
    `产品线：${formatGeoAnalysisDisplayText(task.productLine)}`
  ];

  return segments.join(" · ");
};

const getTaskGapSummary = (task: GeoAnalysisTask) => {
  const contentGapCount = task.contentGaps.length;
  const knowledgeGapCount = task.knowledgeGaps.length;

  if (contentGapCount === 0 && knowledgeGapCount === 0) {
    return "暂无明确缺口";
  }

  return `内容缺口 ${contentGapCount} · 资料缺口 ${knowledgeGapCount}`;
};

const buildQuery = (): GeoAnalysisTaskQuery => ({
  createdFrom: trimOptional(filters.createdFrom),
  createdTo: trimOptional(filters.createdTo),
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
    const result = await getGeoAnalysisTasks(buildQuery());
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
    createdFrom: undefined,
    createdTo: undefined,
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
  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权新建 GEO 诊断任务。");
    return;
  }

  formMode.value = "create";
  editingTask.value = null;
  formError.value = "";
  formVisible.value = true;
};

const openEditDialog = (task: GeoAnalysisTask) => {
  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权编辑 GEO 诊断任务。");
    return;
  }

  if (task.status !== "pending") {
    ElMessage.warning("仅待执行状态的 GEO 诊断任务允许编辑。");
    return;
  }

  formMode.value = "edit";
  editingTask.value = task;
  formError.value = "";
  formVisible.value = true;
};

const canArchiveAnalysisTask = (task?: GeoAnalysisTask | null) =>
  Boolean(
    task &&
      canManageAnalysisActions.value &&
      task.status !== "running" &&
      task.status !== "cancelled"
  );
const isArchiving = (id: string) => archivingIds.value.includes(id);

const withArchiveFlag = async (id: string, action: () => Promise<void>) => {
  archivingIds.value = [...archivingIds.value, id];
  try {
    await action();
  } finally {
    archivingIds.value = archivingIds.value.filter((itemId) => itemId !== id);
  }
};

const handleSubmitTask = async (
  payload: CreateGeoAnalysisTaskPayload | UpdateGeoAnalysisTaskPayload
) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    if (formMode.value === "edit" && editingTask.value) {
      await updateGeoAnalysisTask(editingTask.value.id, payload as UpdateGeoAnalysisTaskPayload);
      ElMessage.success("GEO 诊断任务已更新。");
      formVisible.value = false;
      await loadTasks();
      if (selectedTaskId.value === editingTask.value.id) {
        await loadDetail();
      }
      return;
    }

    const created = await createGeoAnalysisTask(payload as CreateGeoAnalysisTaskPayload);
    ElMessage.success("GEO 诊断任务已创建，可继续运行诊断。");
    formVisible.value = false;
    await loadTasks();
    selectedTaskId.value = created.id;
    detailVisible.value = true;
    await loadDetail();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "诊断任务保存失败。";
  } finally {
    formSubmitting.value = false;
  }
};

const openDetailDrawer = async (task: GeoAnalysisTask) => {
  selectedTaskId.value = task.id;
  convertResult.value = null;
  convertError.value = "";
  contentTaskError.value = "";
  detailVisible.value = true;
  await loadDetail();
};

const loadDetail = async () => {
  if (!selectedTaskId.value) {
    return;
  }

  detailLoading.value = true;

  try {
    detail.value = await getGeoAnalysisTask(selectedTaskId.value);
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
};

const runTask = async (task?: GeoAnalysisTask) => {
  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权运行 GEO 诊断任务。");
    return;
  }

  const targetId = task?.id ?? selectedTaskId.value;
  if (!targetId) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "将基于当前品牌、官网、产品线和目标模型生成诊断结果。确认运行吗？",
      "运行 GEO 诊断",
      {
        cancelButtonText: "取消",
        confirmButtonText: "运行诊断",
        type: "warning"
      }
    );

    running.value = true;
    const result = await runGeoAnalysisTask(targetId);
    detail.value = result;
    selectedTaskId.value = result.task.id;
    detailVisible.value = true;
    convertResult.value = null;
    convertError.value = "";
    ElMessage.success("GEO 诊断已完成。");
    await loadTasks();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "运行诊断失败。");
    }
  } finally {
    running.value = false;
  }
};

const handleArchiveTask = async (task?: GeoAnalysisTask) => {
  const targetTask = task ?? detail.value?.task ?? null;
  const targetId = targetTask?.id ?? selectedTaskId.value;

  if (!targetId) {
    return;
  }

  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权归档 GEO 诊断任务。");
    return;
  }

  if (targetTask?.status === "running") {
    ElMessage.warning("分析中的 GEO 诊断任务暂不能归档。");
    return;
  }

  if (targetTask?.status === "cancelled") {
    ElMessage.info("该 GEO 诊断任务已归档。");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "归档后，该 GEO 诊断任务将从默认列表隐藏，但详情和历史结果仍会保留。",
      "归档 GEO 诊断任务",
      {
        cancelButtonText: "暂不归档",
        confirmButtonText: "归档任务",
        type: "warning"
      }
    );

    await withArchiveFlag(targetId, async () => {
      await archiveGeoAnalysisTask(targetId);
    });
    ElMessage.success("GEO 诊断任务已归档。");
    await loadTasks();
    if (selectedTaskId.value === targetId) {
      await loadDetail();
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "归档 GEO 诊断任务失败。");
    }
  }
};

const handleConvertPrompts = async (payload: ConvertAnalysisPromptsPayload) => {
  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权转入提示词。");
    return;
  }

  if (!selectedTaskId.value) {
    return;
  }

  convertSubmitting.value = true;
  convertError.value = "";

  try {
    convertResult.value = await convertAnalysisPrompts(selectedTaskId.value, payload);
    ElMessage.success("提示词建议已处理，重复项会被清晰跳过。");
    await loadDetail();
  } catch (error) {
    convertError.value = error instanceof Error ? error.message : "转入提示词库失败。";
  } finally {
    convertSubmitting.value = false;
  }
};

const handleCreateContentTask = async (payload: CreateAnalysisContentTaskPayload) => {
  if (!canManageAnalysisActions.value) {
    ElMessage.warning("当前账号无权创建内容任务。");
    return;
  }

  if (!selectedTaskId.value) {
    return;
  }

  contentTaskSubmitting.value = true;
  contentTaskError.value = "";

  try {
    await createAnalysisContentTask(selectedTaskId.value, payload);
    await loadDetail();
    await ElMessageBox.confirm(
      "已基于诊断任务创建 GEO 内容任务。是否前往内容生成页面查看？",
      "内容任务已创建",
      {
        cancelButtonText: "留在分析详情",
        confirmButtonText: "前往内容生成",
        type: "success"
      }
    );
    void router.push("/geo-content");
  } catch (error) {
    if (error !== "cancel") {
      contentTaskError.value =
        error instanceof Error ? error.message : "基于诊断任务创建内容任务失败。";
    }
  } finally {
    contentTaskSubmitting.value = false;
  }
};

onMounted(() => {
  void loadTasks();
});
</script>

<template>
  <section class="geo-analysis-page review-page">
    <header class="geo-analysis-hero review-page__header">
      <div>
        <h1>GEO 诊断</h1>
        <p>前期评估品牌、官网和产品线，快速定位提示词、资料和内容缺口。</p>
      </div>
      <div class="geo-analysis-hero__actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadTasks">刷新</el-button>
        <el-button
          v-if="canManageAnalysisActions"
          type="primary"
          :icon="Plus"
          @click="openCreateDialog"
        >
          新建诊断任务
        </el-button>
      </div>
    </header>

    <section class="geo-analysis-metric-grid review-page__summary compact-metric-row" aria-label="GEO 诊断概览">
      <article
        v-for="metric in analysisMetricCards"
        :key="metric.label"
        class="geo-analysis-metric"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.hint }}</p>
      </article>
    </section>

    <el-collapse class="analysis-relation-collapse review-page__secondary">
      <el-collapse-item title="查看 GEO 诊断闭环说明" name="geo-analysis-flow">
        <section class="analysis-relation-panel">
          <div class="analysis-relation-panel__copy">
            <p class="section-kicker">流程关系</p>
            <h2>先诊断，再补资产，最后复盘命中</h2>
            <p>GEO 诊断是前期策略入口；覆盖记录保存检测明细，GEO 报表负责汇总复盘。</p>
          </div>
          <div class="analysis-flow">
            <span v-for="step in diagnosisFlowSteps" :key="step">{{ step }}</span>
          </div>
          <div class="analysis-relation-actions">
            <el-button
              v-for="link in diagnosisRelationLinks"
              :key="link.path"
              text
              type="primary"
              @click="router.push(link.path)"
            >
              {{ link.label }}
            </el-button>
          </div>
        </section>
      </el-collapse-item>
    </el-collapse>

    <GeoAnalysisTaskFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
    />

    <AppErrorState v-if="hasTableError" title="GEO 诊断任务加载失败" :message="tableError" />

    <section v-loading="loading" class="geo-analysis-table-panel review-page__details">
      <div class="geo-analysis-table-header">
        <span>诊断任务</span>
        <strong>{{ total }} 个任务</strong>
        <p v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</p>
      </div>

      <div v-if="tasks.length > 0" class="analysis-task-asset-list">
        <article v-for="task in tasks" :key="task.id" class="analysis-task-asset-row">
          <div class="analysis-task-asset-main">
            <strong class="analysis-task-name">
              {{ formatGeoAnalysisTaskTitle(task.name, task.brandName) }}
            </strong>
            <p>{{ getTaskAssetSummary(task) }}</p>
            <div class="analysis-task-tags">
              <span>目标模型：{{ formatTargetModelNames(task.targetModels) }}</span>
              <span>提示词建议 {{ task.promptSuggestions.length }}</span>
              <span>{{ getTaskGapSummary(task) }}</span>
            </div>
          </div>

          <div class="analysis-task-asset-status">
            <GeoAnalysisStatusTag :status="task.status" />
            <el-tag effect="plain" type="info">
              {{ task.promptSuggestions.length }} 条建议
            </el-tag>
            <p>{{ getTaskGapSummary(task) }}</p>
          </div>

          <div class="analysis-task-asset-side">
            <span>{{ formatDateTime(task.createdAt) }}</span>
            <div class="analysis-task-actions">
              <el-button size="small" type="primary" plain @click="openDetailDrawer(task)">
                查看详情
              </el-button>
              <el-button
                v-if="canManageAnalysisActions"
                text
                size="small"
                :disabled="task.status !== 'pending'"
                @click="openEditDialog(task)"
              >
                编辑
              </el-button>
              <el-button
                v-if="canManageAnalysisActions && (task.status === 'pending' || task.status === 'failed')"
                size="small"
                type="primary"
                :loading="running && selectedTaskId === task.id"
                @click="runTask(task)"
              >
                运行诊断
              </el-button>
              <el-button
                v-if="canArchiveAnalysisTask(task)"
                size="small"
                plain
                :loading="isArchiving(task.id)"
                @click="handleArchiveTask(task)"
              >
                归档
              </el-button>
            </div>
          </div>
        </article>
      </div>

      <div v-if="isEmpty && !hasTableError" class="analysis-task-empty">
        <span>GEO</span>
        <strong>暂无 GEO 诊断任务</strong>
        <p>先创建一个品牌或产品线诊断任务，再识别提示词、知识库和内容缺口。</p>
        <el-button
          v-if="canManageAnalysisActions"
          type="primary"
          size="small"
          @click="openCreateDialog"
        >
          新建诊断任务
        </el-button>
      </div>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <GeoAnalysisTaskFormDialog
      v-model="formVisible"
      :mode="formMode"
      :task="editingTask"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleSubmitTask"
    />

    <GeoAnalysisTaskDetailDrawer
      v-model="detailVisible"
      :detail="detail"
      :loading="detailLoading"
      :running="running"
      :archiving="selectedTaskArchiving"
      :convert-submitting="convertSubmitting"
      :content-task-submitting="contentTaskSubmitting"
      :convert-result="convertResult"
      :convert-error="convertError"
      :content-task-error="contentTaskError"
      :can-manage-actions="canManageAnalysisActions"
      @refresh="loadDetail"
      @run="runTask"
      @archive="handleArchiveTask()"
      @convert-prompts="handleConvertPrompts"
      @create-content-task="handleCreateContentTask"
      @go-to-prompts="router.push('/geo-prompts')"
      @go-to-content-tasks="router.push('/geo-content')"
    />
  </section>
</template>

<style scoped>
.geo-analysis-page {
  display: grid;
  gap: 10px;
  max-width: 1440px;
  margin: 0 auto;
}

.geo-analysis-hero,
.geo-analysis-table-header {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: var(--geo-surface);
  box-shadow: none;
}

.geo-analysis-hero {
  order: 1;
  padding: 10px 0 12px;
  border: 0;
  border-bottom: 1px solid var(--border-light);
  border-radius: 0;
  background: transparent;
}

.geo-analysis-hero::before {
  display: none;
}

.geo-analysis-hero h1,
.geo-analysis-table-header h2 {
  margin: 4px 0;
  color: #13243a;
  letter-spacing: 0;
}

.geo-analysis-hero h1 {
  font-size: 22px;
  line-height: 1.25;
}

.geo-analysis-hero p,
.geo-analysis-table-header p {
  max-width: 820px;
  margin: 0;
  color: var(--geo-muted);
  font-size: 13px;
  line-height: 1.45;
}

.geo-analysis-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.geo-analysis-alert {
  order: 2;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  background: #eff6ff;
}

.geo-analysis-filter-panel {
  order: 4;
}

.analysis-relation-collapse {
  order: 6;
  overflow: hidden;
  border: 1px solid var(--geo-border);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.analysis-relation-collapse :deep(.el-collapse-item__header) {
  height: 36px;
  padding: 0 12px;
  color: var(--text-regular);
  font-size: 13px;
  font-weight: 650;
}

.analysis-relation-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 0;
}

.geo-analysis-metric-grid {
  display: grid;
  order: 3;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: #ffffff;
}

.geo-analysis-metric {
  display: grid;
  gap: 4px;
  min-height: 62px;
  padding: 9px 10px;
  border: 0;
  border-right: 1px solid var(--border-light);
  border-radius: 0;
  background: #ffffff;
  box-shadow: none;
}

.geo-analysis-metric:nth-child(4) {
  border-right: 0;
  border-color: var(--border-light);
  background: #ffffff;
}

.geo-analysis-metric span {
  color: var(--geo-muted);
  font-size: 12px;
  font-weight: 650;
}

.geo-analysis-metric strong {
  color: #101827;
  font-size: 22px;
  font-weight: 760;
  line-height: 1;
}

.geo-analysis-metric p {
  margin: 0;
  color: var(--geo-muted);
  font-size: 12px;
  line-height: 1.35;
}

.analysis-relation-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--geo-border);
  background: #fbfdff;
}

.analysis-relation-panel__copy h2 {
  margin: 4px 0 6px;
  color: #101827;
  font-size: 16px;
}

.analysis-relation-panel__copy p:not(.section-kicker) {
  max-width: 840px;
  margin: 0;
  color: var(--geo-muted);
  font-size: 13px;
  line-height: 1.45;
}

.analysis-flow,
.analysis-relation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.analysis-flow span {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid #dbe5ef;
  border-radius: 4px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 650;
}

.analysis-flow span::after {
  width: 18px;
  height: 1px;
  margin-left: 10px;
  background: #cbd5e1;
  content: "";
}

.analysis-flow span:last-child::after {
  display: none;
}

.geo-analysis-table-panel {
  display: grid;
  order: 5;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--geo-border);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.geo-analysis-table-header {
  padding: 0 0 2px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--geo-muted);
  font-size: 13px;
}

.geo-analysis-table-header strong {
  color: #13243a;
  font-weight: 700;
}

.analysis-task-name {
  display: -webkit-box;
  color: #13243a;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.analysis-task-asset-list {
  display: grid;
  gap: 0;
  min-width: 0;
  border-top: 1px solid #e5edf5;
}

.analysis-task-asset-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-width: 0;
  padding: 14px 0;
  border-bottom: 1px solid #e5edf5;
}

.analysis-task-asset-row:hover {
  background: #f8fafc;
}

.analysis-task-asset-main {
  display: grid;
  flex: 1;
  gap: 7px;
  min-width: 0;
}

.analysis-task-asset-main p,
.analysis-task-asset-status p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.analysis-task-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.analysis-task-tags span {
  display: inline-flex;
  align-items: center;
  max-width: 260px;
  min-height: 22px;
  padding: 0 7px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-task-asset-status {
  display: grid;
  flex-shrink: 0;
  gap: 7px;
  width: 220px;
  min-width: 0;
}

.analysis-task-asset-status :deep(.el-tag) {
  width: fit-content;
}

.analysis-task-asset-side {
  display: grid;
  flex-shrink: 0;
  justify-items: flex-end;
  gap: 8px;
  width: 230px;
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.analysis-task-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.analysis-task-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 150px;
  padding: 22px 12px;
  color: #64748b;
  text-align: center;
}

.analysis-task-empty span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #f8fafc;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
}

.analysis-task-empty strong {
  color: #13243a;
  font-size: 15px;
}

.analysis-task-empty p {
  max-width: 420px;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .geo-analysis-hero,
  .geo-analysis-table-header {
    flex-direction: column;
  }

  .analysis-task-asset-row {
    display: grid;
    gap: 12px;
  }

  .analysis-task-asset-status,
  .analysis-task-asset-side {
    width: 100%;
    justify-items: flex-start;
    text-align: left;
  }

  .analysis-task-actions {
    justify-content: flex-start;
  }

  .geo-analysis-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .geo-analysis-metric:nth-child(2) {
    border-right: 0;
  }
}

@media (max-width: 640px) {
  .geo-analysis-hero,
  .analysis-relation-panel,
  .geo-analysis-table-panel,
  .geo-analysis-metric {
    padding: 16px;
  }

  .geo-analysis-metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>

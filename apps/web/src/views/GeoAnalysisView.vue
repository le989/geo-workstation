<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh } from "@element-plus/icons-vue";
import {
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
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import GeoAnalysisStatusTag from "@/components/GeoAnalysisStatusTag.vue";
import GeoAnalysisTaskDetailDrawer from "@/components/GeoAnalysisTaskDetailDrawer.vue";
import GeoAnalysisTaskFilters from "@/components/GeoAnalysisTaskFilters.vue";
import GeoAnalysisTaskFormDialog from "@/components/GeoAnalysisTaskFormDialog.vue";
import { formatDateTime, formatOptional, formatTargetModels } from "@/config/geo-prompt-options";

const router = useRouter();

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

const convertSubmitting = ref(false);
const convertResult = ref<ConvertAnalysisPromptsResult | null>(null);
const convertError = ref("");

const contentTaskSubmitting = ref(false);
const contentTaskError = ref("");

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
  formMode.value = "create";
  editingTask.value = null;
  formError.value = "";
  formVisible.value = true;
};

const openEditDialog = (task: GeoAnalysisTask) => {
  if (task.status !== "pending") {
    ElMessage.warning("仅待执行状态的 GEO 分析任务允许编辑。");
    return;
  }

  formMode.value = "edit";
  editingTask.value = task;
  formError.value = "";
  formVisible.value = true;
};

const handleSubmitTask = async (
  payload: CreateGeoAnalysisTaskPayload | UpdateGeoAnalysisTaskPayload
) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    if (formMode.value === "edit" && editingTask.value) {
      await updateGeoAnalysisTask(editingTask.value.id, payload as UpdateGeoAnalysisTaskPayload);
      ElMessage.success("GEO 分析任务已更新。");
      formVisible.value = false;
      await loadTasks();
      if (selectedTaskId.value === editingTask.value.id) {
        await loadDetail();
      }
      return;
    }

    const created = await createGeoAnalysisTask(payload as CreateGeoAnalysisTaskPayload);
    ElMessage.success("GEO 分析任务已创建，可运行模拟分析。");
    formVisible.value = false;
    await loadTasks();
    selectedTaskId.value = created.id;
    detailVisible.value = true;
    await loadDetail();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "分析任务保存失败。";
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
  const targetId = task?.id ?? selectedTaskId.value;
  if (!targetId) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "当前为模拟分析，不会调用真实外部 AI 平台，也不会访问真实网站。确认运行吗？",
      "运行模拟 GEO 分析",
      {
        cancelButtonText: "取消",
        confirmButtonText: "运行分析",
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
    ElMessage.success("模拟 GEO 分析已完成。");
    await loadTasks();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "运行模拟分析失败。");
    }
  } finally {
    running.value = false;
  }
};

const handleConvertPrompts = async (payload: ConvertAnalysisPromptsPayload) => {
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
  if (!selectedTaskId.value) {
    return;
  }

  contentTaskSubmitting.value = true;
  contentTaskError.value = "";

  try {
    await createAnalysisContentTask(selectedTaskId.value, payload);
    await loadDetail();
    await ElMessageBox.confirm(
      "已基于分析任务创建 GEO 内容任务，并复用模拟内容生成链路。是否前往内容生成页面查看？",
      "内容任务已创建",
      {
        cancelButtonText: "留在分析详情",
        confirmButtonText: "前往内容生成",
        type: "success"
      }
    );
    void router.push("/content-tasks");
  } catch (error) {
    if (error !== "cancel") {
      contentTaskError.value =
        error instanceof Error ? error.message : "基于分析任务创建内容任务失败。";
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
  <section class="geo-analysis-page">
    <header class="page-hero">
      <div>
        <el-tag type="success" effect="plain">GEO 诊断</el-tag>
        <h1>GEO 分析</h1>
        <p>
          通过模拟 GEO 分析任务，模拟品牌、产品线和目标模型在 AI 问答场景中的表现，识别
          提示词缺口、知识库缺口和内容补齐方向。
        </p>
      </div>
      <div class="page-hero-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadTasks">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建分析任务</el-button>
      </div>
    </header>

    <el-alert
      title="当前阶段为模拟分析，不调用真实外部 AI 平台，不访问真实网站，不做 SEO 扫描器。"
      type="warning"
      :closable="false"
      show-icon
      class="mock-alert"
    />

    <GeoAnalysisTaskFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreateDialog"
    />

    <AppErrorState v-if="hasTableError" title="GEO 分析任务加载失败" :message="tableError" />

    <section class="table-panel">
      <div class="table-panel-header">
        <div>
          <p class="section-kicker">分析任务</p>
          <h2>分析任务列表</h2>
          <p>
            查看品牌是否被提及、推荐、引用官网，以及哪些任务已经生成提示词建议和内容缺口。
            <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
          </p>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="tasks"
        border
        row-key="id"
        empty-text="暂无 GEO 分析任务"
        class="analysis-task-table"
      >
        <el-table-column label="任务名称" min-width="230" fixed>
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
            <p class="table-subtext">品牌：{{ row.brandName }}</p>
          </template>
        </el-table-column>
        <el-table-column label="官网" min-width="190">
          <template #default="{ row }">
            {{ formatOptional(row.websiteUrl) }}
          </template>
        </el-table-column>
        <el-table-column label="产品线" width="150">
          <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
        </el-table-column>
        <el-table-column label="目标模型" min-width="180">
          <template #default="{ row }">
            {{ formatTargetModels(row.targetModels) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <GeoAnalysisStatusTag :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="提示词建议" width="110">
          <template #default="{ row }">{{ row.promptSuggestions.length }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDetailDrawer(row)">查看详情</el-button>
            <el-button
              size="small"
              :disabled="row.status !== 'pending'"
              @click="openEditDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'failed'"
              size="small"
              type="warning"
              :loading="running && selectedTaskId === row.id"
              @click="runTask(row)"
            >
              运行分析
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <AppEmptyState
        v-if="isEmpty && !hasTableError"
        title="暂无 GEO 分析任务"
        description="先创建一个品牌或产品线分析任务，再运行模拟分析识别提示词、知识库和内容缺口。"
      />

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
      :convert-submitting="convertSubmitting"
      :content-task-submitting="contentTaskSubmitting"
      :convert-result="convertResult"
      :convert-error="convertError"
      :content-task-error="contentTaskError"
      @refresh="loadDetail"
      @run="runTask"
      @convert-prompts="handleConvertPrompts"
      @create-content-task="handleCreateContentTask"
      @go-to-prompts="router.push('/geo-prompts')"
      @go-to-content-tasks="router.push('/content-tasks')"
    />
  </section>
</template>

<style scoped>
.geo-analysis-page {
  display: grid;
  gap: 18px;
}

.page-hero,
.table-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-hero h1,
.table-panel-header h2 {
  margin: 8px 0;
  color: #1f2937;
}

.page-hero p,
.table-panel-header p {
  max-width: 820px;
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.page-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.mock-alert {
  border-radius: 8px;
}

.table-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.analysis-task-table {
  width: 100%;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .page-hero,
  .table-panel-header {
    flex-direction: column;
  }
}
</style>

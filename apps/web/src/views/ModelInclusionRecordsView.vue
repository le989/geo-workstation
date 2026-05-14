<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Connection, Download, Plus, Refresh, Upload } from "@element-plus/icons-vue";
import {
  createModelInclusionRecord,
  exportModelInclusionRecords,
  getModelInclusionRecords,
  getModelInclusionSummary,
  getUncoveredPrompts,
  importModelInclusionRecords,
  runKimiWebSearchCheck,
  type CreateModelInclusionRecordPayload,
  type ImportModelInclusionRecordRow,
  type ImportModelInclusionRecordsResult,
  type ModelInclusionRecord,
  type ModelInclusionRecordQuery,
  type ModelInclusionSummary,
  type UncoveredPrompt,
  type UncoveredPromptsQuery,
  type WebSearchCheckPayload,
  type WebSearchCheckResult
} from "@/api/model-inclusion";
import AppErrorState from "@/components/AppErrorState.vue";
import ModelInclusionFilters from "@/components/ModelInclusionFilters.vue";
import ModelInclusionImportDialog from "@/components/ModelInclusionImportDialog.vue";
import ModelInclusionRecordFormDialog from "@/components/ModelInclusionRecordFormDialog.vue";
import ModelInclusionRecordTable from "@/components/ModelInclusionRecordTable.vue";
import ModelInclusionSummaryCards from "@/components/ModelInclusionSummaryCards.vue";
import ModelInclusionWebSearchDialog from "@/components/ModelInclusionWebSearchDialog.vue";
import UncoveredPromptsTable from "@/components/UncoveredPromptsTable.vue";
import { geoPromptTypeOptions, userIntentOptions } from "@/config/geo-prompt-options";
import { booleanFilterOptions } from "@/config/model-inclusion-options";

const records = ref<ModelInclusionRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const recordsLoading = ref(false);
const recordsError = ref("");
const lastLoadedAt = ref("");

const summary = ref<ModelInclusionSummary | null>(null);
const summaryLoading = ref(false);
const summaryError = ref("");

const filters = reactive<ModelInclusionRecordQuery>({
  page: 1,
  pageSize: 20
});
const uncoveredPromptHint =
  "这些提示词在当前筛选条件下暂无模型覆盖记录，适合优先进行人工检测或补充内容。";

const formVisible = ref(false);
const formSubmitting = ref(false);
const formError = ref("");

const importVisible = ref(false);
const importSubmitting = ref(false);
const importError = ref("");
const importResult = ref<ImportModelInclusionRecordsResult | null>(null);
const exporting = ref(false);

const webSearchVisible = ref(false);
const webSearchSubmitting = ref(false);
const webSearchError = ref("");
const webSearchResult = ref<WebSearchCheckResult | null>(null);

const uncoveredPrompts = ref<UncoveredPrompt[]>([]);
const uncoveredTotal = ref(0);
const uncoveredPage = ref(1);
const uncoveredPageSize = ref(10);
const uncoveredLoading = ref(false);
const uncoveredError = ref("");
const uncoveredFilters = reactive<UncoveredPromptsQuery>({
  page: 1,
  pageSize: 10,
  trackEnabled: true
});

const hasRecordsError = computed(() => Boolean(recordsError.value));
const isRecordsEmpty = computed(() => !recordsLoading.value && records.value.length === 0);

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

const buildRecordQuery = (): ModelInclusionRecordQuery => ({
  brandMentioned: filters.brandMentioned,
  brandRecommended: filters.brandRecommended,
  checkedFrom: trimOptional(filters.checkedFrom),
  checkedTo: trimOptional(filters.checkedTo),
  citedOfficialSite: filters.citedOfficialSite,
  citedContentAsset: filters.citedContentAsset,
  competitorMentioned: filters.competitorMentioned,
  detectionMethod: filters.detectionMethod,
  deviceType: filters.deviceType,
  entryPoint: filters.entryPoint,
  geoPromptId: trimOptional(filters.geoPromptId),
  hitLevel: filters.hitLevel,
  isLoggedIn: filters.isLoggedIn,
  isWebSearchEnabled: filters.isWebSearchEnabled,
  model: trimOptional(filters.model),
  page: page.value,
  pageSize: pageSize.value,
  platform: trimOptional(filters.platform),
  productLine: trimOptional(filters.productLine),
  promptType: filters.promptType,
  recordMethod: filters.recordMethod,
  search: trimOptional(filters.search),
  userIntent: filters.userIntent
});

const buildSummaryQuery = () => ({
  checkedFrom: trimOptional(filters.checkedFrom),
  checkedTo: trimOptional(filters.checkedTo),
  model: trimOptional(filters.model),
  productLine: trimOptional(filters.productLine)
});

const buildUncoveredQuery = (): UncoveredPromptsQuery => ({
  checkedFrom: trimOptional(uncoveredFilters.checkedFrom),
  checkedTo: trimOptional(uncoveredFilters.checkedTo),
  model: trimOptional(uncoveredFilters.model),
  page: uncoveredPage.value,
  pageSize: uncoveredPageSize.value,
  productLine: trimOptional(uncoveredFilters.productLine),
  promptType: uncoveredFilters.promptType,
  trackEnabled: uncoveredFilters.trackEnabled,
  userIntent: uncoveredFilters.userIntent
});

const loadRecords = async () => {
  recordsLoading.value = true;
  recordsError.value = "";

  try {
    const result = await getModelInclusionRecords(buildRecordQuery());
    records.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
    lastLoadedAt.value = new Date().toLocaleString();
  } catch (error) {
    recordsError.value = getErrorMessage(error);
    records.value = [];
    total.value = 0;
  } finally {
    recordsLoading.value = false;
  }
};

const loadSummary = async () => {
  summaryLoading.value = true;
  summaryError.value = "";

  try {
    summary.value = await getModelInclusionSummary(buildSummaryQuery());
  } catch (error) {
    summaryError.value = getErrorMessage(error);
    summary.value = null;
  } finally {
    summaryLoading.value = false;
  }
};

const loadUncoveredPrompts = async () => {
  uncoveredLoading.value = true;
  uncoveredError.value = "";

  try {
    const result = await getUncoveredPrompts(buildUncoveredQuery());
    uncoveredPrompts.value = result.items;
    uncoveredTotal.value = result.total;
    uncoveredPage.value = result.page;
    uncoveredPageSize.value = result.pageSize;
  } catch (error) {
    uncoveredError.value = getErrorMessage(error);
    uncoveredPrompts.value = [];
    uncoveredTotal.value = 0;
  } finally {
    uncoveredLoading.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([loadRecords(), loadSummary(), loadUncoveredPrompts()]);
};

const handleSearch = () => {
  page.value = 1;
  void Promise.all([loadRecords(), loadSummary()]);
};

const handleReset = () => {
  Object.assign(filters, {
    brandMentioned: undefined,
    brandRecommended: undefined,
    checkedFrom: undefined,
    checkedTo: undefined,
    citedOfficialSite: undefined,
    citedContentAsset: undefined,
    competitorMentioned: undefined,
    detectionMethod: undefined,
    deviceType: undefined,
    entryPoint: undefined,
    geoPromptId: undefined,
    hitLevel: undefined,
    isLoggedIn: undefined,
    isWebSearchEnabled: undefined,
    model: undefined,
    page: 1,
    pageSize: pageSize.value,
    platform: undefined,
    productLine: undefined,
    promptType: undefined,
    recordMethod: undefined,
    search: undefined,
    userIntent: undefined
  });
  page.value = 1;
  void Promise.all([loadRecords(), loadSummary()]);
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadRecords();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadRecords();
};

const openCreateDialog = () => {
  formError.value = "";
  formVisible.value = true;
};

const handleCreateRecord = async (payload: CreateModelInclusionRecordPayload) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    await createModelInclusionRecord(payload);
    formVisible.value = false;
    ElMessage.success("模型覆盖记录已保存，最新覆盖状态已由后端更新。");
    await refreshAll();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "覆盖记录保存失败。";
  } finally {
    formSubmitting.value = false;
  }
};

const openImportDialog = () => {
  importError.value = "";
  importResult.value = null;
  importVisible.value = true;
};

const openWebSearchDialog = () => {
  webSearchError.value = "";
  webSearchResult.value = null;
  webSearchVisible.value = true;
};

const handleImportRows = async (rows: ImportModelInclusionRecordRow[]) => {
  importSubmitting.value = true;
  importError.value = "";

  try {
    importResult.value = await importModelInclusionRecords({ rows });
    ElMessage.success("模型覆盖记录导入完成。");
    await refreshAll();
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "导入失败，请检查 rows。";
  } finally {
    importSubmitting.value = false;
  }
};

const handleWebSearchCheck = async (payload: WebSearchCheckPayload) => {
  webSearchSubmitting.value = true;
  webSearchError.value = "";

  try {
    webSearchResult.value = await runKimiWebSearchCheck(payload);
    const providerLabel =
      payload.provider === "volcengine_web_search" ? "豆包 / 火山方舟联网搜索" : "Kimi 联网检测";
    ElMessage.success(
      `${providerLabel}完成：成功 ${webSearchResult.value.successCount} 条，失败 ${webSearchResult.value.failedCount} 条。`
    );
    await refreshAll();
  } catch (error) {
    webSearchError.value = error instanceof Error ? error.message : "联网检测失败。";
  } finally {
    webSearchSubmitting.value = false;
  }
};

const downloadCsv = (csv: string) => {
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "model-inclusion-records.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const handleExport = async () => {
  exporting.value = true;

  try {
    const csv = await exportModelInclusionRecords(buildRecordQuery());
    downloadCsv(csv);
    ElMessage.success("模型覆盖记录 CSV 已导出。");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "CSV 导出失败。");
  } finally {
    exporting.value = false;
  }
};

const handleUncoveredSearch = () => {
  uncoveredPage.value = 1;
  void loadUncoveredPrompts();
};

const handleUncoveredReset = () => {
  Object.assign(uncoveredFilters, {
    checkedFrom: undefined,
    checkedTo: undefined,
    model: undefined,
    page: 1,
    pageSize: uncoveredPageSize.value,
    productLine: undefined,
    promptType: undefined,
    trackEnabled: true,
    userIntent: undefined
  });
  uncoveredPage.value = 1;
  void loadUncoveredPrompts();
};

const handleUncoveredPageChange = (nextPage: number) => {
  uncoveredPage.value = nextPage;
  void loadUncoveredPrompts();
};

const handleUncoveredPageSizeChange = (nextPageSize: number) => {
  uncoveredPageSize.value = nextPageSize;
  uncoveredPage.value = 1;
  void loadUncoveredPrompts();
};

onMounted(() => {
  void refreshAll();
});
</script>

<template>
  <section class="model-inclusion-page">
    <header class="model-inclusion-hero">
      <div>
        <el-tag type="success" effect="plain">GEO 效果复盘</el-tag>
        <h1>模型覆盖记录</h1>
        <p>
          记录 GEO 提示词在不同 AI
          模型中的品牌提及、推荐、官网引用和竞品出现情况，用于判断哪些词已经被覆盖，哪些词还需要补内容或补资料。
        </p>
        <strong>
          第一版支持人工录入 / 导入覆盖记录，并提供 Kimi Web Search API 联网检测与豆包 /
          火山方舟联网搜索检测；不做 PC、移动网页或 App 自动化。
        </strong>
      </div>
      <div class="model-inclusion-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="recordsLoading || summaryLoading" @click="refreshAll">
          刷新
        </el-button>
        <el-button type="success" :icon="Connection" @click="openWebSearchDialog">
          联网检测
        </el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">手动新增记录</el-button>
        <el-button :icon="Upload" @click="openImportDialog">批量导入</el-button>
      </div>
    </header>

    <el-alert
      title="本页是 GEO 效果复盘，不是普通日志查询；支持模型 API、联网搜索 API、PC/移动网页端和 App 抽查等入口字段，并按推荐命中、提及命中、引用命中、竞品命中、未命中、无法判断统计。记录新增或导入成功后会由后端更新对应提示词的最新覆盖状态。"
      type="warning"
      :closable="false"
      show-icon
      class="model-boundary-alert"
    />

    <AppErrorState v-if="summaryError" title="汇总指标加载失败" :message="summaryError" />
    <ModelInclusionSummaryCards :summary="summary" :loading="summaryLoading" />

    <ModelInclusionFilters
      :model-value="filters"
      :loading="recordsLoading"
      :exporting="exporting"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @export="handleExport"
    />

    <AppErrorState v-if="hasRecordsError" title="模型覆盖记录加载失败" :message="recordsError" />

    <el-card class="model-record-table-card" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">模型覆盖记录</p>
            <h2>覆盖记录列表</h2>
            <span>查询品牌是否被提及、是否被推荐、推荐位置、官网引用和竞品出现情况。</span>
          </div>
          <div class="model-table-actions">
            <strong>{{ total }} 条记录</strong>
            <el-button :icon="Download" :loading="exporting" @click="handleExport">
              导出 CSV
            </el-button>
          </div>
        </div>
      </template>

      <ModelInclusionRecordTable :records="records" :loading="recordsLoading" />

      <el-empty
        v-if="isRecordsEmpty && !hasRecordsError"
        description="暂无覆盖记录，可先手动新增或批量导入。"
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

    <el-card class="uncovered-card" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">未覆盖提示词</p>
            <h2>未覆盖提示词</h2>
            <span>{{ uncoveredPromptHint }}</span>
          </div>
          <strong>{{ uncoveredTotal }} 个待检测提示词</strong>
        </div>
      </template>

      <el-form class="uncovered-filters" label-position="top">
        <el-form-item label="AI 模型">
          <el-input
            v-model="uncoveredFilters.model"
            clearable
            placeholder="例如 deepseek"
            @keyup.enter="handleUncoveredSearch"
          />
        </el-form-item>
        <el-form-item label="产品线">
          <el-input
            v-model="uncoveredFilters.productLine"
            clearable
            placeholder="产品线"
            @keyup.enter="handleUncoveredSearch"
          />
        </el-form-item>
        <el-form-item label="提示词类型">
          <el-select v-model="uncoveredFilters.promptType" clearable placeholder="全部类型">
            <el-option
              v-for="option in geoPromptTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="用户意图">
          <el-select v-model="uncoveredFilters.userIntent" clearable placeholder="全部意图">
            <el-option
              v-for="option in userIntentOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="是否追踪">
          <el-select v-model="uncoveredFilters.trackEnabled" clearable placeholder="全部">
            <el-option
              v-for="option in booleanFilterOptions"
              :key="String(option.value)"
              :label="option.value ? '只看追踪词' : '只看不追踪词'"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" :loading="uncoveredLoading" @click="handleUncoveredSearch">
            查询未覆盖
          </el-button>
          <el-button @click="handleUncoveredReset">重置</el-button>
        </div>
      </el-form>

      <AppErrorState v-if="uncoveredError" title="未覆盖提示词加载失败" :message="uncoveredError" />

      <UncoveredPromptsTable :prompts="uncoveredPrompts" :loading="uncoveredLoading" />

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="uncoveredPage"
          v-model:page-size="uncoveredPageSize"
          :total="uncoveredTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="handleUncoveredPageChange"
          @size-change="handleUncoveredPageSizeChange"
        />
      </div>
    </el-card>

    <ModelInclusionRecordFormDialog
      v-model="formVisible"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleCreateRecord"
    />

    <ModelInclusionImportDialog
      v-model="importVisible"
      :submitting="importSubmitting"
      :error-message="importError"
      :result="importResult"
      @submit="handleImportRows"
    />

    <ModelInclusionWebSearchDialog
      v-model="webSearchVisible"
      :submitting="webSearchSubmitting"
      :error-message="webSearchError"
      :result="webSearchResult"
      @submit="handleWebSearchCheck"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Connection, Download, Plus, Refresh, Upload } from "@element-plus/icons-vue";
import {
  createModelInclusionRecord,
  exportModelInclusionRecords,
  getModelInclusionRecords,
  getUncoveredPrompts,
  importModelInclusionRecords,
  restoreModelInclusionRecord,
  runWebSearchCheck,
  updateModelInclusionRecord,
  voidModelInclusionRecord,
  type CreateModelInclusionRecordPayload,
  type ImportModelInclusionRecordRow,
  type ImportModelInclusionRecordsResult,
  type ModelInclusionRecord,
  type ModelInclusionRecordQuery,
  type ModelInclusionSummary,
  type UpdateModelInclusionRecordPayload,
  type UncoveredPrompt,
  type UncoveredPromptsQuery,
  type WebSearchCheckPayload,
  type WebSearchCheckResult
} from "@/api/model-inclusion";
import AppErrorState from "@/components/AppErrorState.vue";
import ModelInclusionFilters from "@/components/ModelInclusionFilters.vue";
import ModelInclusionImportDialog from "@/components/ModelInclusionImportDialog.vue";
import ModelInclusionRecordEditDialog from "@/components/ModelInclusionRecordEditDialog.vue";
import ModelInclusionRecordFormDialog from "@/components/ModelInclusionRecordFormDialog.vue";
import ModelInclusionRecordTable from "@/components/ModelInclusionRecordTable.vue";
import ModelInclusionSummaryCards from "@/components/ModelInclusionSummaryCards.vue";
import ModelInclusionWebSearchDialog from "@/components/ModelInclusionWebSearchDialog.vue";
import UncoveredPromptsTable from "@/components/UncoveredPromptsTable.vue";
import { geoPromptTypeOptions, userIntentOptions } from "@/config/geo-prompt-options";
import {
  booleanFilterOptions,
  enabledMonitoringModelOptions,
  isEnabledMonitoringRecord
} from "@/config/model-inclusion-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction, normalizeRole } from "@/utils/permission";

const authStore = useAuthStore();

const records = ref<ModelInclusionRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const recordsLoading = ref(false);
const recordsError = ref("");
const lastLoadedAt = ref("");

const filters = reactive<ModelInclusionRecordQuery>({
  page: 1,
  pageSize: 20,
  voidStatus: "normal"
});
const uncoveredPromptHint =
  "这些提示词在当前筛选条件下暂无模型覆盖记录，适合优先进行人工检测或补充内容。";

const formVisible = ref(false);
const formSubmitting = ref(false);
const formError = ref("");
const editingRecord = ref<ModelInclusionRecord | null>(null);
const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editError = ref("");

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

const enabledRecords = computed(() => records.value.filter(isEnabledMonitoringRecord));
const inactiveModelRecordCount = computed(() =>
  Math.max(records.value.length - enabledRecords.value.length, 0)
);
const hasRecordsError = computed(() => Boolean(recordsError.value));
const isRecordsEmpty = computed(() => !recordsLoading.value && enabledRecords.value.length === 0);
const normalizedRole = computed(() => {
  const role = String(authStore.currentRole ?? authStore.currentUser?.role ?? "");
  return normalizeRole(role);
});
const isOperator = computed(() => normalizedRole.value === "operator");
const canCreateRecord = computed(() => canUseAction("create", normalizedRole.value));
const canRunWebSearch = computed(() =>
  ["platform_admin", "company_admin"].includes(normalizedRole.value)
);
const canImportRecords = computed(() => canUseAction("import", normalizedRole.value));
const canExportRecords = computed(() => canUseAction("export", normalizedRole.value));
const canManageRecords = computed(() =>
  ["platform_admin", "company_admin"].includes(normalizedRole.value)
);
const inclusionScopeLabel = computed(() => {
  const companyName = authStore.currentCompany?.name ?? "当前公司";

  if (isOperator.value) {
    return `统计范围：我的数据 · ${companyName}`;
  }

  if (normalizedRole.value === "viewer") {
    return `统计范围：只读 · ${companyName}`;
  }

  return `统计范围：当前公司 · ${companyName}`;
});
const activePageSummary = computed<ModelInclusionSummary>(() => {
  const createDistribution = () => ({} as Record<string, number>);
  const summaryResult: ModelInclusionSummary = {
    totalRecords: 0,
    mentionedCount: 0,
    notMentionedCount: 0,
    recommendedCount: 0,
    notRecommendedCount: 0,
    citedOfficialSiteCount: 0,
    citedContentAssetCount: 0,
    competitorMentionedCount: 0,
    webSearchEnabledCount: 0,
    loggedInCount: 0,
    brandMentionRate: 0,
    brandRecommendRate: 0,
    citedOfficialSiteRate: 0,
    citedContentAssetRate: 0,
    competitorMentionRate: 0,
    modelDistribution: createDistribution(),
    platformDistribution: createDistribution(),
    entryPointDistribution: createDistribution(),
    hitLevelDistribution: createDistribution(),
    productLineDistribution: createDistribution()
  };

  const increase = (distribution: Record<string, number>, key?: string | null) => {
    const normalizedKey = key?.trim() || "未填写";
    distribution[normalizedKey] = (distribution[normalizedKey] ?? 0) + 1;
  };

  for (const record of enabledRecords.value) {
    summaryResult.totalRecords += 1;
    summaryResult.mentionedCount += record.brandMentioned ? 1 : 0;
    summaryResult.notMentionedCount += record.brandMentioned ? 0 : 1;
    summaryResult.recommendedCount += record.brandRecommended ? 1 : 0;
    summaryResult.notRecommendedCount += record.brandRecommended ? 0 : 1;
    summaryResult.citedOfficialSiteCount += record.citedOfficialSite ? 1 : 0;
    summaryResult.citedContentAssetCount += record.citedContentAsset ? 1 : 0;
    summaryResult.competitorMentionedCount += record.competitorMentioned ? 1 : 0;
    summaryResult.webSearchEnabledCount += record.isWebSearchEnabled ? 1 : 0;
    summaryResult.loggedInCount += record.isLoggedIn ? 1 : 0;
    increase(summaryResult.modelDistribution, record.model);
    increase(summaryResult.platformDistribution, record.platform);
    increase(summaryResult.entryPointDistribution, String(record.entryPoint ?? ""));
    increase(summaryResult.hitLevelDistribution, String(record.hitLevel ?? ""));
    increase(summaryResult.productLineDistribution, record.geoPrompt.productLine);
  }

  if (summaryResult.totalRecords > 0) {
    summaryResult.brandMentionRate = summaryResult.mentionedCount / summaryResult.totalRecords;
    summaryResult.brandRecommendRate = summaryResult.recommendedCount / summaryResult.totalRecords;
    summaryResult.citedOfficialSiteRate =
      summaryResult.citedOfficialSiteCount / summaryResult.totalRecords;
    summaryResult.citedContentAssetRate =
      summaryResult.citedContentAssetCount / summaryResult.totalRecords;
    summaryResult.competitorMentionRate =
      summaryResult.competitorMentionedCount / summaryResult.totalRecords;
  }

  return summaryResult;
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
  userIntent: filters.userIntent,
  voidStatus: filters.voidStatus ?? "normal"
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
  await Promise.all([loadRecords(), loadUncoveredPrompts()]);
};

const handleSearch = () => {
  page.value = 1;
  void loadRecords();
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
    userIntent: undefined,
    voidStatus: "normal"
  });
  page.value = 1;
  void loadRecords();
};

const openEditDialog = (record: ModelInclusionRecord) => {
  if (!canManageRecords.value && !record.voidedAt) {
    ElMessage.warning("当前角色无权编辑 AI 模型覆盖记录。");
    return;
  }

  editingRecord.value = record;
  editError.value = "";
  editDialogVisible.value = true;
};

const handleUpdateRecord = async (payload: UpdateModelInclusionRecordPayload) => {
  if (!editingRecord.value) {
    return;
  }

  editSubmitting.value = true;
  editError.value = "";

  try {
    await updateModelInclusionRecord(editingRecord.value.id, payload);
    editDialogVisible.value = false;
    editingRecord.value = null;
    ElMessage.success("模型覆盖记录结果字段已更新。");
    await refreshAll();
  } catch (error) {
    editError.value = error instanceof Error ? error.message : "模型覆盖记录更新失败。";
  } finally {
    editSubmitting.value = false;
  }
};

const handleVoidRecord = async (record: ModelInclusionRecord) => {
  if (!canManageRecords.value) {
    ElMessage.warning("当前角色无权作废 AI 模型覆盖记录。");
    return;
  }

  try {
    const { value } = await ElMessageBox.prompt(
      "作废后默认不进入报表统计。请填写作废原因：",
      "作废模型覆盖记录",
      {
        confirmButtonText: "确认作废",
        cancelButtonText: "取消",
        inputType: "textarea",
        inputPlaceholder: "例如：人工复查发现该回答来源错误",
        inputValidator: (value) => Boolean(value?.trim()) || "作废原因不能为空",
        type: "warning"
      }
    );
    await voidModelInclusionRecord(record.id, {
      voidReason: value.trim()
    });
    ElMessage.success("模型覆盖记录已作废，默认不再进入报表统计。");
    await refreshAll();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error instanceof Error ? error.message : "作废失败。");
  }
};

const handleRestoreRecord = async (record: ModelInclusionRecord) => {
  if (!canManageRecords.value) {
    ElMessage.warning("当前角色无权恢复 AI 模型覆盖记录。");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "恢复后该记录会重新进入默认列表和报表统计。",
      "恢复模型覆盖记录",
      {
        confirmButtonText: "确认恢复",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
    await restoreModelInclusionRecord(record.id);
    ElMessage.success("模型覆盖记录已恢复。");
    await refreshAll();
  } catch (error) {
    if (error === "cancel" || error === "close") {
      return;
    }
    ElMessage.error(error instanceof Error ? error.message : "恢复失败。");
  }
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
  if (!canCreateRecord.value) {
    ElMessage.warning("当前角色无权新增 AI 模型覆盖记录。");
    return;
  }

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
  if (!canImportRecords.value) {
    ElMessage.warning("当前角色无权批量导入 AI 模型覆盖记录。");
    return;
  }

  importError.value = "";
  importResult.value = null;
  importVisible.value = true;
};

const openWebSearchDialog = () => {
  if (!canRunWebSearch.value) {
    ElMessage.warning("当前角色无权发起联网检测。");
    return;
  }

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
    webSearchResult.value = await runWebSearchCheck(payload);
    const providerLabel =
      payload.provider === "volcengine_web_search"
        ? "豆包 / 火山方舟联网搜索"
        : payload.provider === "aliyun_bailian_web_search"
          ? "通义千问 / 阿里云百炼联网搜索"
          : "Kimi 联网检测";
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
  if (!canExportRecords.value) {
    ElMessage.warning("当前角色无权导出 AI 模型覆盖记录。");
    return;
  }

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
    <header class="model-inclusion-hero model-inclusion-toolbar">
      <div class="model-inclusion-toolbar__main">
        <div>
          <p class="section-kicker">GEO 监测台账</p>
          <h1>AI 模型覆盖记录</h1>
          <span>{{ inclusionScopeLabel }} · {{ total }} 条记录</span>
        </div>
        <div class="model-inclusion-hero__models" aria-label="当前启用监测模型">
          <span>启用模型</span>
          <strong v-for="option in enabledMonitoringModelOptions" :key="option.value">
            {{ option.label }}
          </strong>
        </div>
      </div>
      <div class="model-inclusion-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="recordsLoading || uncoveredLoading" @click="refreshAll">
          刷新
        </el-button>
        <el-button v-if="canCreateRecord" type="primary" :icon="Plus" @click="openCreateDialog">
          新增记录
        </el-button>
        <el-button v-if="canImportRecords" :icon="Upload" @click="openImportDialog">
          导入
        </el-button>
        <el-button
          v-if="canExportRecords"
          :icon="Download"
          :loading="exporting"
          @click="handleExport"
        >
          导出
        </el-button>
        <el-button v-if="canRunWebSearch" :icon="Connection" @click="openWebSearchDialog">
          联网检测
        </el-button>
      </div>
    </header>

    <ModelInclusionFilters
      :model-value="filters"
      :loading="recordsLoading"
      :exporting="exporting"
      :can-export="false"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @export="handleExport"
    />

    <AppErrorState v-if="hasRecordsError" title="AI 模型覆盖记录加载失败" :message="recordsError" />

    <el-card class="model-record-table-card" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">AI 模型覆盖记录</p>
            <h2>当前匹配记录</h2>
            <span>优先处理新增、导入、导出和联网检测；统计分布已收起到分析概览。</span>
          </div>
          <div class="model-table-actions">
            <strong>{{ enabledRecords.length }} 条启用模型记录</strong>
          </div>
        </div>
      </template>

      <el-alert
        v-if="inactiveModelRecordCount > 0"
        :title="`已隐藏当前页 ${inactiveModelRecordCount} 条非当前监测范围记录。`"
        type="info"
        :closable="false"
        show-icon
        class="model-active-filter-alert"
      />

      <ModelInclusionRecordTable
        :records="enabledRecords"
        :loading="recordsLoading"
        :can-manage-records="canManageRecords"
        @edit="openEditDialog"
        @void="handleVoidRecord"
        @restore="handleRestoreRecord"
      />

      <el-empty
        v-if="isRecordsEmpty && !hasRecordsError"
        description="当前启用监测模型暂无覆盖记录，可先手动新增、导入或发起联网检测。"
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

    <el-collapse class="model-analysis-collapse">
      <el-collapse-item title="分析概览 / 统计分布" name="analysis">
        <ModelInclusionSummaryCards :summary="activePageSummary" :loading="recordsLoading" />
      </el-collapse-item>
    </el-collapse>

    <el-card class="uncovered-card" shadow="never">
      <template #header>
        <div class="table-card-header">
          <div>
            <p class="section-kicker">未覆盖提示词</p>
            <h2>未覆盖提示词辅助排查</h2>
            <span>{{ uncoveredPromptHint }}</span>
          </div>
          <strong>{{ uncoveredTotal }} 个待检测提示词</strong>
        </div>
      </template>

      <el-collapse class="uncovered-collapse">
        <el-collapse-item title="展开未覆盖提示词" name="uncovered-prompts">
          <el-form class="uncovered-filters" label-position="top">
            <el-form-item label="AI 模型">
              <el-select v-model="uncoveredFilters.model" clearable placeholder="全部启用模型">
                <el-option
                  v-for="option in enabledMonitoringModelOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
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

          <AppErrorState
            v-if="uncoveredError"
            title="未覆盖提示词加载失败"
            :message="uncoveredError"
          />

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
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <ModelInclusionRecordFormDialog
      v-model="formVisible"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleCreateRecord"
    />

    <ModelInclusionRecordEditDialog
      v-model="editDialogVisible"
      :record="editingRecord"
      :submitting="editSubmitting"
      :error-message="editError"
      :readonly="Boolean(editingRecord?.voidedAt)"
      @submit="handleUpdateRecord"
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

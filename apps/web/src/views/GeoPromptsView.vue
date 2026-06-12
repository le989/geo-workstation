<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, MagicStick, Plus, Refresh, Upload } from "@element-plus/icons-vue";
import {
  bulkImportGeoPrompts,
  createGeoPrompt,
  deleteGeoPrompt,
  exportGeoPrompts,
  getGeoPrompts,
  updateGeoPrompt,
  type BulkImportGeoPromptsPayload,
  type BulkImportGeoPromptsResult,
  type CreateGeoPromptPayload,
  type GeoPrompt,
  type GeoPromptQuery,
  type GeoPromptType,
  type UpdateGeoPromptPayload
} from "@/api/geo-prompts";
import AppErrorState from "@/components/AppErrorState.vue";
import GeoPromptBulkImportDialog from "@/components/GeoPromptBulkImportDialog.vue";
import GeoPromptFormDialog from "@/components/GeoPromptFormDialog.vue";
import {
  coverageStatusLabelMap,
  coverageStatusOptions,
  formatDateTime,
  formatGeoPromptDisplayText,
  formatTargetModels,
  geoPromptTypeLabelMap,
  geoPromptTypeOptions,
  inferBuyingStage,
  inferPromptBusinessValue,
  inferQuestionType,
  userIntentLabelMap,
  userIntentOptions
} from "@/config/geo-prompt-options";
import { useAuthStore } from "@/stores/auth";
import { canAccessRoute, canUseAction } from "@/utils/permission";

const router = useRouter();
const authStore = useAuthStore();

const prompts = ref<GeoPrompt[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const tableError = ref("");
const lastLoadedAt = ref("");
const activeType = ref<GeoPromptType | undefined>();

const filters = reactive<GeoPromptQuery>({
  page: 1,
  pageSize: 10
});

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingPrompt = ref<GeoPrompt | null>(null);
const formSubmitting = ref(false);
const formError = ref("");

const importVisible = ref(false);
const importSubmitting = ref(false);
const importError = ref("");
const importResult = ref<BulkImportGeoPromptsResult | null>(null);
const exporting = ref(false);
const advancedFiltersExpanded = ref(false);

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && prompts.value.length === 0);
const promptBusinessItems = computed(() =>
  prompts.value.map((prompt) => {
    const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);

    return {
      id: prompt.id,
      businessValue: inferPromptBusinessValue(prompt.promptText, questionType.value, prompt.userIntent),
      buyingStage: inferBuyingStage(prompt.promptText, questionType.value, prompt.userIntent),
      questionType
    };
  })
);
const promptBusinessInsightById = computed(() =>
  Object.fromEntries(promptBusinessItems.value.map((item) => [item.id, item]))
);
const compactPromptMetrics = computed(() => {
  // 顶部指标只读当前筛选结果，避免额外请求或改变后端统计口径。
  return [
    {
      label: "总数",
      value: total.value
    },
    {
      label: "追踪中",
      value: prompts.value.filter((prompt) => prompt.trackEnabled).length
    },
    {
      label: "高优",
      value: prompts.value.filter((prompt) => prompt.priority <= 2).length
    },
    {
      label: "待复测",
      value: prompts.value.filter((prompt) =>
        ["unknown", "not_mentioned", undefined, ""].includes(prompt.latestCoverageStatus)
      ).length
    },
    {
      label: "高意向",
      value: promptBusinessItems.value.filter((item) => item.businessValue.value === "high").length
    },
    {
      label: "采购对比",
      value: promptBusinessItems.value.filter((item) =>
        ["purchase", "comparison"].includes(item.buyingStage.value)
      ).length
    }
  ];
});

const formatPromptTitle = (prompt: GeoPrompt) =>
  formatGeoPromptDisplayText(prompt.promptText, "GEO 提示词");

const getPromptBusinessInsight = (prompt: GeoPrompt) => {
  const insight = promptBusinessInsightById.value[prompt.id];

  if (insight) {
    return insight;
  }

  const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);

  return {
    businessValue: inferPromptBusinessValue(prompt.promptText, questionType.value, prompt.userIntent),
    buyingStage: inferBuyingStage(prompt.promptText, questionType.value, prompt.userIntent),
    questionType
  };
};

const formatPromptContext = (prompt: GeoPrompt) => {
  const parts = [
    formatGeoPromptDisplayText(prompt.scenario, ""),
    userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "--";
};

const formatPromptAssetMeta = (prompt: GeoPrompt) =>
  [
    `来源：${formatGeoPromptDisplayText(prompt.source, "未填写")}`,
    `场景：${formatPromptContext(prompt)}`,
    `类型：${geoPromptTypeLabelMap[prompt.type]}`
  ].join(" / ");

const formatCompactDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateTime(value);
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hour}:${minute}`;
};

const getCoverageStatusLabel = (status?: string) =>
  coverageStatusLabelMap[status ?? ""] ?? "未知";

const getCoverageToneClass = (status?: string) => {
  if (status === "recommended" || status === "mentioned") {
    return "geo-asset-badge--success";
  }

  if (status === "not_mentioned") {
    return "geo-asset-badge--danger";
  }

  return "geo-asset-badge--warning";
};

const getPriorityToneClass = (priority: number) => {
  if (priority <= 2) {
    return "geo-asset-badge--danger";
  }

  if (priority === 3) {
    return "geo-asset-badge--warning";
  }

  return "geo-asset-badge--muted";
};

const getPromptTagItems = (prompt: GeoPrompt) => {
  const insight = getPromptBusinessInsight(prompt);
  const tags = [
    geoPromptTypeLabelMap[prompt.type],
    userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent,
    insight.questionType.label,
    insight.businessValue.label
  ];

  if (prompt.baseWord) {
    tags.unshift(`训练词：${prompt.baseWord}`);
  }

  if (prompt.productLine) {
    tags.push(prompt.productLine);
  }

  return tags;
};

const isOperatorRole = () =>
  ["operator", "geo_operator", "content_editor"].includes(String(authStore.currentRole ?? ""));
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canCreatePromptAction = computed(() => canUseAction("create", currentRole.value));
const canImportPrompts = computed(() => canUseAction("import", currentRole.value));
const canExportPrompts = computed(() => canUseAction("export", currentRole.value));
const canOpenExpansion = computed(() => canAccessRoute("/expansion", currentRole.value));

const canManagePrompt = (prompt: GeoPrompt) => {
  if (prompt.visibility === "PLATFORM") {
    return false;
  }

  if (isOperatorRole()) {
    return prompt.visibility === "PRIVATE" && prompt.createdBy === authStore.currentUser?.id;
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

const buildQuery = (): GeoPromptQuery => ({
  latestCoverageStatus: trimOptional(filters.latestCoverageStatus),
  page: page.value,
  pageSize: pageSize.value,
  priority: filters.priority,
  productLine: trimOptional(filters.productLine),
  search: trimOptional(filters.search),
  trackEnabled: filters.trackEnabled,
  type: activeType.value,
  userIntent: filters.userIntent
});

const loadPrompts = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await getGeoPrompts(buildQuery());
    prompts.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
    lastLoadedAt.value = new Date().toLocaleString();
  } catch (error) {
    tableError.value = getErrorMessage(error);
    prompts.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  void loadPrompts();
};

const handleReset = () => {
  activeType.value = undefined;
  Object.assign(filters, {
    latestCoverageStatus: undefined,
    page: 1,
    pageSize: pageSize.value,
    priority: undefined,
    productLine: undefined,
    search: undefined,
    trackEnabled: undefined,
    type: undefined,
    userIntent: undefined
  });
  page.value = 1;
  void loadPrompts();
};

const handleTypeChange = (type?: GeoPromptType) => {
  activeType.value = type;
  page.value = 1;
  void loadPrompts();
};

const handleTypeFilterChange = (type?: GeoPromptType | "") => {
  handleTypeChange(type || undefined);
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadPrompts();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadPrompts();
};

const openCreateDialog = () => {
  if (!canCreatePromptAction.value) {
    ElMessage.warning("当前账号无权新增 GEO 提示词。");
    return;
  }

  formMode.value = "create";
  editingPrompt.value = null;
  formError.value = "";
  formVisible.value = true;
};

const openEditDialog = (prompt: GeoPrompt) => {
  formMode.value = "edit";
  editingPrompt.value = prompt;
  formError.value = "";
  formVisible.value = true;
};

const handleFormSubmit = async (payload: CreateGeoPromptPayload | UpdateGeoPromptPayload) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    if (formMode.value === "create") {
      await createGeoPrompt(payload as CreateGeoPromptPayload);
      ElMessage.success("GEO 提示词已加入策略库。");
    } else if (editingPrompt.value) {
      await updateGeoPrompt(editingPrompt.value.id, payload);
      ElMessage.success("GEO 提示词已更新。");
    }

    formVisible.value = false;
    await loadPrompts();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally {
    formSubmitting.value = false;
  }
};

const handleDelete = async (prompt: GeoPrompt) => {
  try {
    await ElMessageBox.confirm(
      `确认从策略库移除该提示词吗？\n${prompt.promptText}`,
      "删除 GEO 提示词",
      {
        cancelButtonText: "取消",
        confirmButtonText: "移除",
        type: "warning"
      }
    );

    await deleteGeoPrompt(prompt.id);
    ElMessage.success("已从策略库移除该提示词。");
    await loadPrompts();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    }
  }
};

const openImportDialog = () => {
  if (!canImportPrompts.value) {
    ElMessage.warning("当前账号无权批量导入 GEO 提示词。");
    return;
  }

  importError.value = "";
  importResult.value = null;
  importVisible.value = true;
};

const handleBulkImport = async (payload: BulkImportGeoPromptsPayload) => {
  importSubmitting.value = true;
  importError.value = "";

  try {
    const result = await bulkImportGeoPrompts(payload);
    importResult.value = result;
    if (result.successCount > 0) {
      ElMessage.success(`成功导入 ${result.successCount} 条 GEO 提示词。`);
      await loadPrompts();
    } else {
      ElMessage.warning("本次导入没有新增提示词，请查看重复行或失败行。");
    }
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "批量导入失败，请稍后重试。";
  } finally {
    importSubmitting.value = false;
  }
};

const handleExport = async () => {
  if (!canExportPrompts.value) {
    ElMessage.warning("当前账号无权导出 GEO 提示词。");
    return;
  }

  exporting.value = true;

  try {
    const csv = await exportGeoPrompts(buildQuery());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "geo-prompts.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    ElMessage.success("CSV 已导出。");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "导出 CSV 失败，请稍后重试。");
  } finally {
    exporting.value = false;
  }
};

const goExpansion = () => {
  if (!canOpenExpansion.value) {
    ElMessage.warning("当前账号无权使用 AI 拓词。");
    return;
  }

  void router.push("/expansion");
};

onMounted(() => {
  void loadPrompts();
});
</script>

<template>
  <section class="geo-prompts-page core-list-page">
    <header class="geo-prompts-hero core-list-header">
      <div>
        <h1>提示词库</h1>
        <p>管理真实问法、问法类型和追踪状态。</p>
      </div>
      <div class="geo-prompts-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <div class="geo-prompts-hero__action-row">
          <el-button :icon="Refresh" link :loading="loading" @click="loadPrompts">
            刷新列表
          </el-button>
          <el-button v-if="canImportPrompts" :icon="Upload" plain @click="openImportDialog">
            批量导入
          </el-button>
          <el-button v-if="canOpenExpansion" :icon="MagicStick" plain @click="goExpansion">
            AI 拓词
          </el-button>
          <el-button
            v-if="canExportPrompts"
            :icon="Download"
            link
            :loading="exporting"
            @click="handleExport"
          >
            导出 CSV
          </el-button>
          <el-button
            v-if="canCreatePromptAction"
            :icon="Plus"
            type="primary"
            @click="openCreateDialog"
          >
            新增提示词
          </el-button>
        </div>
      </div>
    </header>

    <section class="geo-prompts-control-panel core-filter-bar" aria-label="提示词筛选与统计">
      <div class="geo-prompts-metric-strip" aria-label="提示词资产紧凑指标">
        <span v-for="metric in compactPromptMetrics" :key="metric.label">
          {{ metric.label }}
          <strong>{{ metric.value }}</strong>
        </span>
      </div>

      <div class="geo-prompts-quick-filter-row">
        <el-input
          v-model="filters.search"
          class="geo-prompts-search-input"
          clearable
          placeholder="搜索提示词、训练词或应用场景..."
          @keyup.enter="handleSearch"
        />
        <el-select
          :model-value="activeType"
          class="geo-prompts-compact-select"
          clearable
          placeholder="类型：全部"
          @change="handleTypeFilterChange"
        >
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select
          v-model="filters.trackEnabled"
          class="geo-prompts-compact-select"
          clearable
          placeholder="追踪：全部"
        >
          <el-option label="追踪中" :value="true" />
          <el-option label="不追踪" :value="false" />
        </el-select>
        <el-select
          v-model="filters.latestCoverageStatus"
          class="geo-prompts-compact-select"
          clearable
          placeholder="覆盖：全部"
        >
          <el-option
            v-for="option in coverageStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <button
          class="geo-prompts-advanced-toggle"
          type="button"
          :aria-expanded="advancedFiltersExpanded"
          @click="advancedFiltersExpanded = !advancedFiltersExpanded"
        >
          高级筛选
        </button>
        <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <section
        v-if="advancedFiltersExpanded"
        class="geo-prompts-advanced-inline"
        aria-label="提示词高级筛选"
      >
        <el-form class="geo-prompts-advanced-form" label-position="top">
          <el-form-item label="产品线">
            <el-input v-model="filters.productLine" clearable placeholder="输入产品线" />
          </el-form-item>
          <el-form-item label="用户意图">
            <el-select v-model="filters.userIntent" clearable placeholder="全部意图">
              <el-option
                v-for="option in userIntentOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="filters.priority" clearable placeholder="全部优先级">
              <el-option
                v-for="priority in [1, 2, 3, 4, 5]"
                :key="priority"
                :label="`P${priority}`"
                :value="priority"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </section>
    </section>

    <AppErrorState v-if="hasTableError" title="提示词库加载失败" :message="tableError" />

    <section class="geo-prompts-asset-panel core-data-panel">
      <div class="geo-prompts-table-header">
        <div>
          <p class="section-kicker">提示词资产</p>
          <h2>资产列表</h2>
        </div>
      </div>

      <section v-loading="loading" class="geo-prompts-asset-list" aria-label="提示词资产列表">
        <article v-for="prompt in prompts" :key="prompt.id" class="geo-asset-row">
          <div class="geo-asset-main">
            <strong class="geo-asset-title" :title="prompt.promptText">
              {{ formatPromptTitle(prompt) }}
            </strong>
            <p class="geo-asset-meta">{{ formatPromptAssetMeta(prompt) }}</p>
            <div class="geo-asset-tag-row" aria-label="提示词业务标签">
              <span
                v-for="tag in getPromptTagItems(prompt)"
                :key="`${prompt.id}-${tag}`"
                class="geo-asset-tag"
              >
                {{ tag }}
              </span>
              <span v-if="prompt.visibility === 'PLATFORM'" class="geo-asset-tag--readonly">
                平台只读
              </span>
            </div>
            <dl class="geo-asset-detail-grid">
              <div>
                <dt>目标模型</dt>
                <dd>{{ formatTargetModels(prompt.targetModels) }}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{{ formatDateTime(prompt.createdAt) }}</dd>
              </div>
            </dl>
          </div>

          <div class="geo-asset-status" aria-label="提示词状态">
            <span :class="['geo-asset-badge', getPriorityToneClass(prompt.priority)]">
              P{{ prompt.priority }}
            </span>
            <span class="geo-asset-dot-text">
              <i
                :class="[
                  'status-dot',
                  prompt.trackEnabled ? 'status-dot--success' : 'status-dot--muted'
                ]"
                aria-hidden="true"
              />
              {{ prompt.trackEnabled ? "追踪中" : "不追踪" }}
            </span>
            <span :class="['geo-asset-badge', getCoverageToneClass(prompt.latestCoverageStatus)]">
              {{ getCoverageStatusLabel(prompt.latestCoverageStatus) }}
            </span>
          </div>

          <div class="geo-asset-actions">
            <time :datetime="prompt.updatedAt">{{ formatCompactDate(prompt.updatedAt) }}</time>
            <div>
              <template v-if="canManagePrompt(prompt)">
                <el-button link type="primary" @click="openEditDialog(prompt)">编辑</el-button>
                <el-button link class="danger-action-link" @click="handleDelete(prompt)">
                  删除
                </el-button>
              </template>
              <span v-else class="muted-table-action">只读</span>
            </div>
          </div>
        </article>

        <div v-if="isEmpty && !hasTableError" class="geo-prompts-asset-empty">
          <el-empty
            description="未找到匹配的提示词资产"
            :image-size="82"
          >
            <template #image>
              <div class="empty-mark">GEO</div>
            </template>
            <el-button @click="handleReset">清空筛选</el-button>
          </el-empty>
        </div>
      </section>

      <div class="geo-prompts-pagination">
        <span>共 {{ total }} 条提示词资产</span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <GeoPromptFormDialog
      v-model="formVisible"
      :mode="formMode"
      :prompt="editingPrompt"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleFormSubmit"
    />

    <GeoPromptBulkImportDialog
      v-model="importVisible"
      :submitting="importSubmitting"
      :result="importResult"
      :error-message="importError"
      @submit="handleBulkImport"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Download, MagicStick, Plus, Refresh } from "@element-plus/icons-vue";
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
import GeoPromptFilters from "@/components/GeoPromptFilters.vue";
import GeoPromptFormDialog from "@/components/GeoPromptFormDialog.vue";
import GeoPromptStatusTag from "@/components/GeoPromptStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import {
  formatDateTime,
  formatOptional,
  formatTargetModels,
  userIntentLabelMap
} from "@/config/geo-prompt-options";

const router = useRouter();

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

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && prompts.value.length === 0);

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
  void router.push("/expansion");
};

onMounted(() => {
  void loadPrompts();
});
</script>

<template>
  <section class="geo-prompts-page">
    <header class="geo-prompts-hero">
      <div>
        <el-tag type="success" effect="plain">GEO 提示词策略</el-tag>
        <h1>提示词策略库</h1>
        <p>沉淀训练词、蒸馏词、品牌词和场景词，用于指导 GEO 内容生成、模型覆盖记录和后续优化。</p>
        <strong>用户会怎么问 AI？哪些词需要追踪？哪些产品线还要补充提示词？</strong>
      </div>
      <div class="geo-prompts-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadPrompts">
          刷新列表
        </el-button>
      </div>
    </header>

    <GeoPromptFilters
      :model-value="filters"
      :active-type="activeType"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreateDialog"
      @import="openImportDialog"
      @export="handleExport"
      @expansion="goExpansion"
      @type-change="handleTypeChange"
    />

    <AppErrorState v-if="hasTableError" title="提示词策略库加载失败" :message="tableError" />

    <section class="geo-prompts-table-panel">
      <div class="geo-prompts-table-header">
        <div>
          <p class="section-kicker">提示词资产</p>
          <h2>GEO 提示词列表</h2>
          <p>从策略词、追踪状态和覆盖结果判断下一步应该补词、补内容还是补检测。</p>
        </div>
        <div class="geo-prompts-table-tools">
          <el-button :icon="MagicStick" @click="goExpansion">AI 拓词</el-button>
          <el-button :icon="Plus" type="primary" @click="openCreateDialog">新增提示词</el-button>
          <el-button :icon="Download" :loading="exporting" @click="handleExport">
            导出 CSV
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="prompts"
        class="geo-prompts-table"
        row-key="id"
        border
        empty-text="暂无 GEO 提示词，可先新增、批量导入，或前往 AI 拓词生成候选。"
      >
        <el-table-column prop="promptText" label="GEO 提示词" min-width="260" fixed="left">
          <template #default="{ row }: { row: GeoPrompt }">
            <strong class="prompt-text-cell">{{ row.promptText }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="词类型" width="104">
          <template #default="{ row }: { row: GeoPrompt }">
            <GeoPromptTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column prop="baseWord" label="训练词" min-width="150">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatOptional(row.baseWord) }}
          </template>
        </el-table-column>
        <el-table-column prop="productLine" label="产品线" min-width="140">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatOptional(row.productLine) }}
          </template>
        </el-table-column>
        <el-table-column prop="scenario" label="应用场景" min-width="150">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatOptional(row.scenario) }}
          </template>
        </el-table-column>
        <el-table-column prop="userIntent" label="用户意图" width="122">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ userIntentLabelMap[row.userIntent] ?? row.userIntent }}
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="96" align="center">
          <template #default="{ row }: { row: GeoPrompt }">
            <el-tag :type="row.priority <= 2 ? 'warning' : 'info'" effect="plain">
              P{{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trackEnabled" label="是否追踪" width="104" align="center">
          <template #default="{ row }: { row: GeoPrompt }">
            <el-tag :type="row.trackEnabled ? 'success' : 'info'" effect="plain">
              {{ row.trackEnabled ? "追踪" : "不追踪" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="latestCoverageStatus"
          label="最新覆盖状态"
          width="128"
          align="center"
        >
          <template #default="{ row }: { row: GeoPrompt }">
            <GeoPromptStatusTag :status="row.latestCoverageStatus" />
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="130">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatOptional(row.source) }}
          </template>
        </el-table-column>
        <el-table-column prop="targetModels" label="目标模型" min-width="170">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatTargetModels(row.targetModels) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="176">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="138" fixed="right">
          <template #default="{ row }: { row: GeoPrompt }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="
              isEmpty
                ? '暂无 GEO 提示词，可先新增、批量导入，或前往 AI 拓词生成候选。'
                : '正在加载 GEO 提示词'
            "
          >
            <template #image>
              <div class="empty-mark">GEO</div>
            </template>
          </el-empty>
        </template>
      </el-table>

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

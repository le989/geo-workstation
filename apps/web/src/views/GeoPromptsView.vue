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
import GeoPromptFilters from "@/components/GeoPromptFilters.vue";
import GeoPromptFormDialog from "@/components/GeoPromptFormDialog.vue";
import GeoPromptStatusTag from "@/components/GeoPromptStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import {
  formatDateTime,
  formatGeoPromptDisplayText,
  formatTargetModels,
  inferBuyingStage,
  inferPromptBusinessValue,
  inferQuestionType,
  userIntentLabelMap
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

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && prompts.value.length === 0);
const promptAssetCards = computed(() => [
  {
    label: "提示词总数",
    value: total.value,
    hint: "当前筛选下 GEO 词资产"
  },
  {
    label: "追踪词数量",
    value: prompts.value.filter((prompt) => prompt.trackEnabled).length,
    hint: "当前页已开启模型追踪"
  },
  {
    label: "高优先级词",
    value: prompts.value.filter((prompt) => prompt.priority <= 2).length,
    hint: "P1 / P2 优先处理"
  },
  {
    label: "待检测 / 未命中",
    value: prompts.value.filter((prompt) =>
      ["unknown", "not_mentioned", undefined, ""].includes(prompt.latestCoverageStatus)
    ).length,
    hint: "可进入模型覆盖记录复测"
  }
]);
const promptBusinessInsights = computed(() => {
  const promptBusinessItems = prompts.value.map((prompt) => {
    const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);

    return {
      businessValue: inferPromptBusinessValue(prompt.promptText, questionType.value, prompt.userIntent),
      buyingStage: inferBuyingStage(prompt.promptText, questionType.value, prompt.userIntent)
    };
  });

  return [
    {
      label: "高意向问法",
      value: promptBusinessItems.filter((item) => item.businessValue.value === "high").length,
      hint: "优先监测、补证据和写文章"
    },
    {
      label: "采购 / 对比阶段",
      value: promptBusinessItems.filter((item) =>
        ["purchase", "comparison"].includes(item.buyingStage.value)
      ).length,
      hint: "更接近转化和品牌替代"
    },
    {
      label: "售后阶段",
      value: promptBusinessItems.filter((item) => item.buyingStage.value === "aftersales").length,
      hint: "适合沉淀 FAQ 和排查内容"
    },
    {
      label: "待判断问法",
      value: promptBusinessItems.filter(
        (item) => item.businessValue.value === "unknown" || item.buyingStage.value === "unknown"
      ).length,
      hint: "需要人工补充上下文"
    }
  ];
});

const visibilityLabelMap = {
  COMPANY: "公司公共",
  PLATFORM: "平台公共",
  PRIVATE: "我的"
} as const;

const formatPromptTitle = (prompt: GeoPrompt) =>
  formatGeoPromptDisplayText(prompt.promptText, "GEO 提示词");

const getQuestionTypeLabel = (prompt: GeoPrompt) =>
  inferQuestionType(prompt.promptText, prompt.userIntent).label;

const getPromptBusinessValue = (prompt: GeoPrompt) => {
  const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);

  return inferPromptBusinessValue(prompt.promptText, questionType.value, prompt.userIntent);
};

const getBuyingStage = (prompt: GeoPrompt) => {
  const questionType = inferQuestionType(prompt.promptText, prompt.userIntent);

  return inferBuyingStage(prompt.promptText, questionType.value, prompt.userIntent);
};

const formatPromptContext = (prompt: GeoPrompt) => {
  const parts = [
    formatGeoPromptDisplayText(prompt.scenario, ""),
    userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "--";
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
  <section class="geo-prompts-page">
    <header class="geo-prompts-hero">
      <div>
        <el-tag type="success" effect="plain">GEO 提示词策略</el-tag>
        <h1>提示词库</h1>
        <p>管理品牌词、产品词、场景词和问题词，作为 GEO 内容生产与模型检测的基础资产。</p>
        <strong>
          {{ "用户会怎么问 AI？" }}
          GEO 更关注真实问法，建议优先沉淀完整自然问句。
        </strong>
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

    <section class="geo-prompts-asset-grid" aria-label="提示词资产概览">
      <article v-for="asset in promptAssetCards" :key="asset.label" class="geo-prompts-asset-card">
        <span>{{ asset.label }}</span>
        <strong>{{ asset.value }}</strong>
        <p>{{ asset.hint }}</p>
      </article>
    </section>

    <section class="geo-prompts-value-panel" aria-label="问法业务价值概览">
      <div>
        <p class="section-kicker">业务判断</p>
        <h2>先看哪些问法值得优先处理</h2>
        <p>
          业务价值和购买阶段由前端根据问句文本轻量推断，只用于运营排序参考，不写入数据库。
        </p>
      </div>
      <div class="geo-prompts-value-grid">
        <article
          v-for="insight in promptBusinessInsights"
          :key="insight.label"
          class="geo-prompts-value-card"
        >
          <span>{{ insight.label }}</span>
          <strong>{{ insight.value }}</strong>
          <p>{{ insight.hint }}</p>
        </article>
      </div>
    </section>

    <GeoPromptFilters
      :model-value="filters"
      :active-type="activeType"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @type-change="handleTypeChange"
    />

    <AppErrorState v-if="hasTableError" title="提示词库加载失败" :message="tableError" />

    <section class="geo-prompts-table-panel">
      <div class="geo-prompts-table-header">
        <div>
          <p class="section-kicker">提示词资产</p>
          <h2>GEO 提示词列表</h2>
          <p>
            问法类型用于识别用户会怎么问 AI；业务价值和购买阶段帮助判断先补问法、补证据、写文章还是复盘模型。
          </p>
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
        <el-table-column type="expand" width="42">
          <template #default="{ row }: { row: GeoPrompt }">
            <div class="geo-prompt-row-detail">
              <section>
                <p class="section-kicker">GEO 策略信息</p>
                <dl>
                  <div>
                    <dt>训练词</dt>
                    <dd>{{ formatGeoPromptDisplayText(row.baseWord, "--") }}</dd>
                  </div>
                  <div>
                    <dt>产品线</dt>
                    <dd>{{ formatGeoPromptDisplayText(row.productLine, "--") }}</dd>
                  </div>
                  <div>
                    <dt>应用场景</dt>
                    <dd>{{ formatGeoPromptDisplayText(row.scenario, "--") }}</dd>
                  </div>
                  <div>
                    <dt>适用模型</dt>
                    <dd>{{ formatTargetModels(row.targetModels) }}</dd>
                  </div>
                  <div>
                    <dt>问法类型</dt>
                    <dd>{{ getQuestionTypeLabel(row) }}</dd>
                  </div>
                  <div>
                    <dt>业务价值</dt>
                    <dd>{{ getPromptBusinessValue(row).label }}</dd>
                  </div>
                  <div>
                    <dt>购买阶段</dt>
                    <dd>{{ getBuyingStage(row).label }}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <p class="section-kicker">排查信息</p>
                <dl>
                  <div>
                    <dt>来源</dt>
                    <dd>{{ formatGeoPromptDisplayText(row.source, "--") }}</dd>
                  </div>
                  <div>
                    <dt>创建时间</dt>
                    <dd>{{ formatDateTime(row.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt>原始提示词</dt>
                    <dd>{{ row.promptText }}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="promptText" label="提示词 / 问题" min-width="280" fixed="left">
          <template #default="{ row }: { row: GeoPrompt }">
            <div class="prompt-main-cell">
              <strong class="prompt-text-cell" :title="row.promptText">
                {{ formatPromptTitle(row) }}
              </strong>
              <span>{{ visibilityLabelMap[row.visibility] }}</span>
              <div class="prompt-insight-chip-row">
                <small class="question-type-chip">问法类型：{{ getQuestionTypeLabel(row) }}</small>
                <small
                  class="prompt-insight-chip"
                  :class="`prompt-insight-chip--value-${getPromptBusinessValue(row).value}`"
                  :title="getPromptBusinessValue(row).description"
                >
                  业务价值：{{ getPromptBusinessValue(row).label }}
                </small>
                <small
                  class="prompt-insight-chip"
                  :class="`prompt-insight-chip--stage-${getBuyingStage(row).value}`"
                  :title="getBuyingStage(row).description"
                >
                  购买阶段：{{ getBuyingStage(row).label }}
                </small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="104">
          <template #default="{ row }: { row: GeoPrompt }">
            <GeoPromptTypeTag :type="row.type" />
          </template>
        </el-table-column>
        <el-table-column prop="userIntent" label="场景 / 意图" min-width="160">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatPromptContext(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="96" align="center">
          <template #default="{ row }: { row: GeoPrompt }">
            <el-tag :type="row.priority <= 2 ? 'warning' : 'info'" effect="plain">
              P{{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trackEnabled" label="追踪状态" width="104" align="center">
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
        <el-table-column prop="updatedAt" label="更新时间" min-width="176">
          <template #default="{ row }: { row: GeoPrompt }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="128" fixed="right">
          <template #default="{ row }: { row: GeoPrompt }">
            <template v-if="canManagePrompt(row)">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button link class="danger-action-link" @click="handleDelete(row)">删除</el-button>
            </template>
            <span v-else class="muted-table-action">只读</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="
              isEmpty
                ? '暂无 GEO 提示词，可先添加采购、选型、替代、场景或售后排查类真实问法。'
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

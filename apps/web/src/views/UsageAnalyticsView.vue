<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  getUsageByModel,
  getUsageByProvider,
  getUsageByDepartment,
  getUsageByModule,
  getUsageByUser,
  getUsageLedgerRecords,
  getUsageLedgerSummary,
  getUsageSummary,
  getUsageTrends,
  type UsageByModelItem,
  type UsageByProviderItem,
  type UsageBreakdownItem,
  type UsageLedgerQuery,
  type UsageLedgerRecordItem,
  type UsageLedgerSummary,
  type UsageSummary,
  type UsageTrendItem,
  type UsageTrendQuery
} from "@/api/usage";
import AppErrorState from "@/components/AppErrorState.vue";

type DateRangeValue = [string, string] | null;

const emptySummary = (): UsageSummary => ({
  totalRequests: 0,
  totalTokens: 0,
  mockRequests: 0,
  realRequests: 0,
  successCount: 0,
  failureCount: 0
});

const emptyUsageLedgerSummary = (): UsageLedgerSummary => ({
  totalRequestCount: 0,
  realRequestCount: 0,
  mockRequestCount: 0,
  successRequestCount: 0,
  failureRequestCount: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  realPromptTokens: 0,
  realCompletionTokens: 0,
  realTotalTokens: 0,
  mockPromptTokens: 0,
  mockCompletionTokens: 0,
  mockTotalTokens: 0,
  usageUnknownCount: 0,
  uniqueProviderCount: 0,
  uniqueModelCount: 0,
  uniqueUserCount: 0,
  recordCount: 0
});

const moduleOptions = [
  { label: "全部模块", value: "" },
  { label: "GEO 诊断", value: "geo-analysis" },
  { label: "AI 拓词", value: "expansion" },
  { label: "售后问答", value: "aftersales-qa" },
  { label: "GEO 内容生成", value: "geo-content" },
  { label: "AI 模型覆盖记录", value: "model-inclusion-records" }
];

const moduleLabelMap: Record<string, string> = {
  "geo-analysis": "GEO 诊断",
  expansion: "AI 拓词",
  "aftersales-qa": "售后问答",
  "geo-content": "GEO 内容生成",
  "model-inclusion-records": "AI 模型覆盖记录"
};

const loading = ref(false);
const errorMessage = ref("");
const activeUsageTab = ref("overview");
const activeTab = ref("module");
const filters = reactive({
  moduleKey: "",
  granularity: "day" as "day" | "week" | "month"
});
const dateRange = ref<DateRangeValue>(null);
const summary = ref<UsageSummary>(emptySummary());
const todaySummary = ref<UsageSummary>(emptySummary());
const weekSummary = ref<UsageSummary>(emptySummary());
const monthSummary = ref<UsageSummary>(emptySummary());
const byModule = ref<UsageBreakdownItem[]>([]);
const byUser = ref<UsageBreakdownItem[]>([]);
const byDepartment = ref<UsageBreakdownItem[]>([]);
const trends = ref<UsageTrendItem[]>([]);
const aiLedgerLoading = ref(false);
const aiLedgerLoaded = ref(false);
const aiLedgerErrorMessage = ref("");
const aiLedgerDateRange = ref<DateRangeValue>(null);
const aiLedgerFilters = reactive({
  provider: "",
  model: "",
  moduleKey: "",
  userId: "",
  isMock: "all" as "all" | "true" | "false",
  success: "all" as "all" | "true" | "false",
  page: 1,
  pageSize: 10
});
const aiLedgerSummary = ref<UsageLedgerSummary>(emptyUsageLedgerSummary());
const aiLedgerProviderItems = ref<UsageByProviderItem[]>([]);
const aiLedgerModelItems = ref<UsageByModelItem[]>([]);
const aiLedgerRecords = ref<UsageLedgerRecordItem[]>([]);
const aiLedgerRecordsTotal = ref(0);

const rangeQuery = computed(() => ({
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1]
}));

const buildQuery = (): UsageTrendQuery => ({
  moduleKey: filters.moduleKey || undefined,
  granularity: filters.granularity,
  startDate: rangeQuery.value.startDate,
  endDate: rangeQuery.value.endDate
});

const toOptionalBoolean = (value: "all" | "true" | "false") => {
  if (value === "all") {
    return undefined;
  }

  return value === "true";
};

const buildAiUsageLedgerQuery = (): UsageLedgerQuery => ({
  provider: aiLedgerFilters.provider.trim() || undefined,
  model: aiLedgerFilters.model.trim() || undefined,
  moduleKey: aiLedgerFilters.moduleKey || undefined,
  userId: aiLedgerFilters.userId.trim() || undefined,
  isMock: toOptionalBoolean(aiLedgerFilters.isMock),
  success: toOptionalBoolean(aiLedgerFilters.success),
  startDate: aiLedgerDateRange.value?.[0],
  endDate: aiLedgerDateRange.value?.[1]
});

const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat("zh-CN").format(value ?? 0);

const formatCompactNumber = (value: number | null | undefined) => {
  const number = value ?? 0;

  if (number >= 10000) {
    return `${(number / 10000).toFixed(1)}w`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return formatNumber(number);
};

const getModuleLabel = (moduleKey?: string | null) =>
  moduleKey ? (moduleLabelMap[moduleKey] ?? moduleKey) : "未归类";

const actionLabelMap: Record<string, string> = {
  ai_generate: "AI 生成",
  content_generate: "GEO 内容生成",
  quality_check: "内容质量检查",
  publish_optimize: "发布优化",
  web_search_check: "模型覆盖联网检测"
};

const getActionLabel = (action?: string | null) =>
  action ? (actionLabelMap[action] ?? action) : "未归类";

const formatDateTime = (value: string) => new Date(value).toLocaleString("zh-CN", {
  hour12: false
});

const formatProviderModel = (provider?: string | null, model?: string | null) =>
  `${provider || "未记录 Provider"} / ${model || "未记录模型"}`;

const getLedgerRecordUser = (record: UsageLedgerRecordItem) =>
  record.userName ?? record.userId ?? "系统任务";

const getLedgerStatusText = (record: UsageLedgerRecordItem) =>
  `${record.isMock ? "Mock" : "真实"}·${record.success ? "成功" : "失败"}`;

const getLedgerStatusTagType = (record: UsageLedgerRecordItem) => {
  if (!record.success) {
    return "danger";
  }

  return record.isMock ? "info" : "success";
};

const getRankPercent = (value: number, max: number) =>
  `${max > 0 ? Math.max((value / max) * 100, 6) : 0}%`;

const topProviders = computed(() => aiLedgerProviderItems.value.slice(0, 5));
const topModels = computed(() => aiLedgerModelItems.value.slice(0, 5));
const maxProviderTokens = computed(() =>
  Math.max(...topProviders.value.map((item) => item.totalTokens), 0)
);
const maxModelTokens = computed(() => Math.max(...topModels.value.map((item) => item.totalTokens), 0));

const aiLedgerIssueCount = computed(
  () => aiLedgerSummary.value.failureRequestCount + aiLedgerSummary.value.usageUnknownCount
);

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfWeek = () => {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const loadData = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const query = buildQuery();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      summaryResult,
      todayResult,
      weekResult,
      monthResult,
      moduleResult,
      userResult,
      departmentResult,
      trendResult,
    ] = await Promise.all([
      getUsageSummary(query),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(today) }),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(startOfWeek()) }),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(startOfMonth()) }),
      getUsageByModule(query),
      getUsageByUser(query),
      getUsageByDepartment(query),
      getUsageTrends(query)
    ]);

    summary.value = summaryResult;
    todaySummary.value = todayResult;
    weekSummary.value = weekResult;
    monthSummary.value = monthResult;
    byModule.value = moduleResult.items;
    byUser.value = userResult.items;
    byDepartment.value = departmentResult.items;
    trends.value = trendResult.items;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 使用统计加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
};

const loadAiUsageLedger = async () => {
  aiLedgerLoading.value = true;
  aiLedgerErrorMessage.value = "";

  try {
    const query = buildAiUsageLedgerQuery();
    const [summaryResult, providerResult, modelResult, recordsResult] = await Promise.all([
      getUsageLedgerSummary(query),
      getUsageByProvider(query),
      getUsageByModel(query),
      getUsageLedgerRecords({
        ...query,
        page: aiLedgerFilters.page,
        pageSize: aiLedgerFilters.pageSize
      })
    ]);

    aiLedgerSummary.value = summaryResult;
    aiLedgerProviderItems.value = providerResult.items;
    aiLedgerModelItems.value = modelResult.items;
    aiLedgerRecords.value = recordsResult.items;
    aiLedgerRecordsTotal.value = recordsResult.total;
    aiLedgerLoaded.value = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 用量统计加载失败";
    aiLedgerErrorMessage.value = message;
    ElMessage.error(message);
  } finally {
    aiLedgerLoading.value = false;
  }
};

const handleUsageTabChange = (tabName: string | number) => {
  if (tabName === "ai-usage" && !aiLedgerLoaded.value) {
    void loadAiUsageLedger();
  }
};

const applyAiUsageLedgerFilters = () => {
  aiLedgerFilters.page = 1;
  void loadAiUsageLedger();
};

const resetAiUsageLedgerFilters = () => {
  aiLedgerDateRange.value = null;
  aiLedgerFilters.provider = "";
  aiLedgerFilters.model = "";
  aiLedgerFilters.moduleKey = "";
  aiLedgerFilters.userId = "";
  aiLedgerFilters.isMock = "all";
  aiLedgerFilters.success = "all";
  aiLedgerFilters.page = 1;
  void loadAiUsageLedger();
};

const handleAiUsageLedgerPageChange = (page: number) => {
  aiLedgerFilters.page = page;
  void loadAiUsageLedger();
};

const handleAiUsageLedgerPageSizeChange = (pageSize: number) => {
  aiLedgerFilters.page = 1;
  aiLedgerFilters.pageSize = pageSize;
  void loadAiUsageLedger();
};

const copyLedgerLogId = async (logId: string) => {
  try {
    await navigator.clipboard.writeText(logId);
    ElMessage.success("Log ID 已复制");
  } catch {
    ElMessage.error("Log ID 复制失败，请手动复制");
  }
};

onMounted(() => {
  void loadData();
});
</script>

<template>
  <section class="usage-page">
    <el-tabs v-model="activeUsageTab" class="usage-root-tabs" @tab-change="handleUsageTabChange">
      <el-tab-pane label="总体统计" name="overview">
        <div class="toolbar-row usage-toolbar-panel">
          <el-form inline>
            <el-form-item label="模块">
              <el-select v-model="filters.moduleKey" class="toolbar-control">
                <el-option
                  v-for="item in moduleOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="时间">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                class="date-control"
              />
            </el-form-item>
            <el-form-item label="趋势">
              <el-segmented
                v-model="filters.granularity"
                :options="[
                  { label: '日', value: 'day' },
                  { label: '周', value: 'week' },
                  { label: '月', value: 'month' }
                ]"
              />
            </el-form-item>
          </el-form>
          <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadData">
            刷新
          </el-button>
        </div>

        <AppErrorState v-if="errorMessage" :message="errorMessage" @retry="loadData" />

        <template v-else>
          <div class="metric-grid">
            <div class="metric-card">
              <span>今日调用</span>
              <strong>{{ formatNumber(todaySummary.totalRequests) }}</strong>
              <small>基础模式 {{ formatNumber(todaySummary.mockRequests) }}</small>
            </div>
            <div class="metric-card">
              <span>本周调用</span>
              <strong>{{ formatNumber(weekSummary.totalRequests) }}</strong>
              <small>失败 {{ formatNumber(weekSummary.failureCount) }}</small>
            </div>
            <div class="metric-card">
              <span>本月调用</span>
              <strong>{{ formatNumber(monthSummary.totalRequests) }}</strong>
              <small>真实 {{ formatNumber(monthSummary.realRequests) }}</small>
            </div>
            <div class="metric-card">
              <span>总 token</span>
              <strong>{{ formatNumber(summary.totalTokens) }}</strong>
              <small>请求 {{ formatNumber(summary.totalRequests) }}</small>
            </div>
            <div class="metric-card">
              <span>基础生成模式</span>
              <strong>{{ formatNumber(summary.mockRequests) }}</strong>
              <small>token 记 0</small>
            </div>
            <div class="metric-card">
              <span>真实调用</span>
              <strong>{{ formatNumber(summary.realRequests) }}</strong>
              <small>预留 Provider</small>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="usage-tabs">
            <el-tab-pane label="按模块" name="module">
              <el-table :data="byModule" :loading="loading" border>
                <el-table-column label="模块" min-width="180">
                  <template #default="{ row }">{{ getModuleLabel(row.moduleKey) }}</template>
                </el-table-column>
                <el-table-column prop="totalRequests" label="调用次数" width="120" />
                <el-table-column prop="totalTokens" label="Token" width="120" />
                <el-table-column prop="mockRequests" label="基础模式" width="120" />
                <el-table-column prop="realRequests" label="真实" width="120" />
                <el-table-column prop="failureCount" label="失败" width="120" />
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="按用户" name="user">
              <el-table :data="byUser" :loading="loading" border>
                <el-table-column label="用户" min-width="180">
                  <template #default="{ row }">{{ row.userName ?? row.userId ?? "系统任务" }}</template>
                </el-table-column>
                <el-table-column prop="totalRequests" label="调用次数" width="120" />
                <el-table-column prop="totalTokens" label="Token" width="120" />
                <el-table-column prop="mockRequests" label="基础模式" width="120" />
                <el-table-column prop="failureCount" label="失败" width="120" />
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="按部门" name="department">
              <el-table :data="byDepartment" :loading="loading" border>
                <el-table-column label="部门" min-width="180">
                  <template #default="{ row }">
                    {{ row.departmentName ?? row.departmentId ?? "未绑定部门" }}
                  </template>
                </el-table-column>
                <el-table-column prop="totalRequests" label="调用次数" width="120" />
                <el-table-column prop="totalTokens" label="Token" width="120" />
                <el-table-column prop="mockRequests" label="基础模式" width="120" />
                <el-table-column prop="failureCount" label="失败" width="120" />
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="趋势" name="trend">
              <el-table :data="trends" :loading="loading" border>
                <el-table-column prop="period" label="周期" min-width="140" />
                <el-table-column prop="totalRequests" label="调用次数" width="120" />
                <el-table-column prop="totalTokens" label="Token" width="120" />
                <el-table-column prop="mockRequests" label="基础模式" width="120" />
                <el-table-column prop="realRequests" label="真实" width="120" />
                <el-table-column prop="failureCount" label="失败" width="120" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </template>
      </el-tab-pane>

      <el-tab-pane label="AI 用量统计" name="ai-usage">
        <section class="ai-ledger-section">
          <div class="usage-section-header">
            <div>
              <p class="section-kicker">AI 用量</p>
              <h2>AI 用量统计</h2>
              <p class="usage-muted">
                本页仅展示系统底层 AI 请求次数与 Token 用量。Mock 拦截不计入真实调用，当前版本不涉及财务核算与真实扣点。
              </p>
            </div>
            <el-tag type="info" effect="plain">只读统计</el-tag>
          </div>

          <el-alert
            v-if="aiLedgerErrorMessage"
            :title="aiLedgerErrorMessage"
            type="error"
            show-icon
            :closable="false"
          />

          <template v-else>
            <div class="ledger-metric-strip">
              <div class="ledger-metric-card">
                <span>请求总数</span>
                <strong>{{ formatNumber(aiLedgerSummary.totalRequestCount) }}</strong>
                <small>
                  真实 {{ formatNumber(aiLedgerSummary.realRequestCount) }} · Mock
                  {{ formatNumber(aiLedgerSummary.mockRequestCount) }}
                </small>
              </div>
              <div class="ledger-metric-card">
                <span>Token 消耗总计</span>
                <strong>{{ formatNumber(aiLedgerSummary.totalTokens) }}</strong>
                <small>
                  输入 {{ formatNumber(aiLedgerSummary.promptTokens) }} · 输出
                  {{ formatNumber(aiLedgerSummary.completionTokens) }}
                </small>
                <small>
                  真实 Token {{ formatNumber(aiLedgerSummary.realTotalTokens) }} · Mock Token
                  {{ formatNumber(aiLedgerSummary.mockTotalTokens) }}
                </small>
              </div>
              <div class="ledger-metric-card">
                <span>异常排查</span>
                <strong>{{ formatNumber(aiLedgerIssueCount) }}</strong>
                <small>
                  失败 {{ formatNumber(aiLedgerSummary.failureRequestCount) }} · 用量未知
                  {{ formatNumber(aiLedgerSummary.usageUnknownCount) }}
                </small>
              </div>
            </div>

            <div class="ledger-filter-panel">
              <el-form inline class="ledger-filter-form">
                <el-form-item label="时间范围" class="ledger-date-filter">
                  <el-date-picker
                    v-model="aiLedgerDateRange"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    class="date-control"
                  />
                </el-form-item>
                <el-form-item label="Provider">
                  <el-input
                    v-model="aiLedgerFilters.provider"
                    clearable
                    class="toolbar-control"
                    placeholder="全部 Provider"
                  />
                </el-form-item>
                <el-form-item label="业务模块">
                  <el-select v-model="aiLedgerFilters.moduleKey" class="toolbar-control" filterable>
                    <el-option
                      v-for="item in moduleOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="Model">
                  <el-input
                    v-model="aiLedgerFilters.model"
                    clearable
                    class="toolbar-control"
                    placeholder="全部模型"
                  />
                </el-form-item>
                <el-form-item label="操作人">
                  <el-input
                    v-model="aiLedgerFilters.userId"
                    clearable
                    class="toolbar-control"
                    placeholder="用户 ID"
                  />
                </el-form-item>
                <el-form-item label="是否 Mock">
                  <el-select v-model="aiLedgerFilters.isMock" class="status-control">
                    <el-option label="全部" value="all" />
                    <el-option label="Mock" value="true" />
                    <el-option label="真实调用" value="false" />
                  </el-select>
                </el-form-item>
                <el-form-item label="结果">
                  <el-select v-model="aiLedgerFilters.success" class="status-control">
                    <el-option label="全部" value="all" />
                    <el-option label="成功" value="true" />
                    <el-option label="失败" value="false" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="aiLedgerLoading" @click="applyAiUsageLedgerFilters">
                    查询
                  </el-button>
                  <el-button @click="resetAiUsageLedgerFilters">重置</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="ledger-rank-grid">
              <section class="ledger-rank-panel">
                <div class="rank-header">
                  <h3>消耗 Top Provider</h3>
                  <span>Top {{ topProviders.length }}</span>
                </div>
                <template v-if="topProviders.length">
                  <article v-for="item in topProviders" :key="item.provider" class="rank-row">
                    <div>
                      <strong :title="item.provider">{{ item.provider }}</strong>
                      <small>
                        请求 {{ formatNumber(item.requestCount) }} · Token
                        {{ formatCompactNumber(item.totalTokens) }}
                      </small>
                    </div>
                    <div class="rank-bar" aria-hidden="true">
                      <span :style="{ width: getRankPercent(item.totalTokens, maxProviderTokens) }" />
                    </div>
                  </article>
                </template>
                <el-empty v-else description="暂无 Provider 用量" />
              </section>

              <section class="ledger-rank-panel">
                <div class="rank-header">
                  <h3>消耗 Top Model</h3>
                  <span>Top {{ topModels.length }}</span>
                </div>
                <template v-if="topModels.length">
                  <article
                    v-for="item in topModels"
                    :key="`${item.provider}-${item.model ?? 'unknown'}`"
                    class="rank-row"
                  >
                    <div>
                      <strong :title="formatProviderModel(item.provider, item.model)">
                        {{ item.model ?? "未记录模型" }}
                      </strong>
                      <small>
                        {{ item.provider }} · Token {{ formatCompactNumber(item.totalTokens) }}
                      </small>
                    </div>
                    <div class="rank-bar" aria-hidden="true">
                      <span :style="{ width: getRankPercent(item.totalTokens, maxModelTokens) }" />
                    </div>
                  </article>
                </template>
                <el-empty v-else description="暂无 Model 用量" />
              </section>
            </div>

            <section class="ledger-records-panel">
              <div class="rank-header">
                <h3>明细记录</h3>
                <span>{{ formatNumber(aiLedgerRecordsTotal) }} 条</span>
              </div>

              <div class="ledger-desktop-table">
                <el-table :data="aiLedgerRecords" :loading="aiLedgerLoading" border>
                  <el-table-column label="时间 / 操作人" min-width="180">
                    <template #default="{ row }">
                      <strong>{{ formatDateTime(row.createdAt) }}</strong>
                      <small>{{ getLedgerRecordUser(row) }}</small>
                    </template>
                  </el-table-column>
                  <el-table-column label="业务模块 / 动作" min-width="180">
                    <template #default="{ row }">
                      <strong>{{ getModuleLabel(row.moduleKey) }}</strong>
                      <small>{{ getActionLabel(row.action) }}</small>
                    </template>
                  </el-table-column>
                  <el-table-column label="Provider / 模型" min-width="200">
                    <template #default="{ row }">
                      <strong class="provider-model-text" :title="row.provider">{{ row.provider }}</strong>
                      <small class="provider-model-text" :title="row.model ?? '未记录模型'">
                        {{ row.model ?? "未记录模型" }}
                      </small>
                    </template>
                  </el-table-column>
                  <el-table-column label="调度状态" width="160">
                    <template #default="{ row }">
                      <el-tag :type="getLedgerStatusTagType(row)" effect="plain">
                        {{ getLedgerStatusText(row) }}
                      </el-tag>
                      <el-tag v-if="row.usageUnknown" type="warning" effect="plain">
                        用量未知
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="消耗明细" min-width="170">
                    <template #default="{ row }">
                      <strong v-if="row.usageUnknown">用量未知</strong>
                      <strong v-else>{{ formatNumber(row.totalTokens) }} Tokens</strong>
                      <small>
                        输入 {{ formatNumber(row.promptTokens) }} · 输出
                        {{ formatNumber(row.completionTokens) }}
                      </small>
                      <small>请求 {{ formatNumber(row.requestCount) }} 次</small>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="130" fixed="right">
                    <template #default="{ row }">
                      <el-button text type="primary" @click="copyLedgerLogId(row.logId)">
                        复制 Log ID
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <div class="ledger-mobile-list">
                <article v-for="row in aiLedgerRecords" :key="row.id" class="ledger-mobile-card">
                  <div class="mobile-card-header">
                    <div>
                      <strong>{{ getModuleLabel(row.moduleKey) }}</strong>
                      <small>{{ getActionLabel(row.action) }}</small>
                    </div>
                    <strong v-if="row.usageUnknown">用量未知</strong>
                    <strong v-else>{{ formatCompactNumber(row.totalTokens) }} Tokens</strong>
                  </div>
                  <p>{{ formatProviderModel(row.provider, row.model) }}</p>
                  <p>{{ getLedgerRecordUser(row) }} · {{ formatDateTime(row.createdAt) }}</p>
                  <div class="mobile-card-tags">
                    <el-tag :type="getLedgerStatusTagType(row)" effect="plain">
                      {{ getLedgerStatusText(row) }}
                    </el-tag>
                    <el-tag v-if="row.usageUnknown" type="warning" effect="plain">
                      用量未知
                    </el-tag>
                  </div>
                  <el-button text type="primary" @click="copyLedgerLogId(row.logId)">
                    复制 Log ID
                  </el-button>
                </article>
              </div>

              <el-empty
                v-if="!aiLedgerLoading && !aiLedgerRecords.length"
                description="暂无 AI 用量记录"
              />

              <el-pagination
                v-model:current-page="aiLedgerFilters.page"
                v-model:page-size="aiLedgerFilters.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="aiLedgerRecordsTotal"
                background
                layout="total, sizes, prev, pager, next"
                @current-change="handleAiUsageLedgerPageChange"
                @size-change="handleAiUsageLedgerPageSizeChange"
              />
            </section>
          </template>
        </section>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.usage-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.usage-toolbar-panel {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
  padding: 14px;
}

.usage-toolbar-panel :deep(.el-form) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.usage-toolbar-panel :deep(.el-form-item) {
  margin: 0;
}

.usage-toolbar-panel :deep(.el-input__wrapper),
.usage-toolbar-panel :deep(.el-select__wrapper) {
  background: #f8fafc;
}

.toolbar-control {
  width: 210px;
}

.date-control {
  width: 280px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.metric-card {
  min-height: 112px;
  padding: 16px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.metric-card span,
.metric-card small {
  display: block;
  color: #667586;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #172331;
  font-size: 28px;
  line-height: 1.15;
}

.usage-tabs {
  min-width: 0;
}

.usage-root-tabs {
  min-width: 0;
}

.usage-root-tabs :deep(.el-tab-pane) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-ledger-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
  padding: 16px;
}

.usage-muted {
  max-width: 760px;
  margin: 6px 0 0;
  color: #667586;
  line-height: 1.7;
}

.usage-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.usage-section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #172331;
}

.usage-ai-metrics {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.ledger-metric-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ledger-metric-card,
.ledger-rank-panel,
.ledger-records-panel {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.ledger-metric-card span,
.ledger-metric-card small {
  display: block;
  color: #667586;
}

.ledger-metric-card strong {
  display: block;
  margin: 6px 0 4px;
  color: #172331;
  font-size: 24px;
  line-height: 1.2;
}

.ledger-filter-panel {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.ledger-filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.ledger-filter-form :deep(.el-form-item) {
  margin: 0;
}

.ledger-date-filter {
  min-width: 300px;
}

.status-control {
  width: 140px;
}

.ledger-rank-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rank-header h3 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #33485c;
}

.rank-header span {
  color: #667586;
  font-size: 12px;
}

.rank-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #e7edf4;
}

.rank-row:first-of-type {
  border-top: 0;
}

.rank-row strong,
.rank-row small,
.provider-model-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row small {
  color: #667586;
}

.rank-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7edf4;
}

.rank-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.ledger-records-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.usage-page :deep(.el-table small) {
  display: block;
  margin-top: 4px;
  color: #667586;
}

.ledger-mobile-list {
  display: none;
}

.ledger-mobile-card {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.mobile-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mobile-card-header strong,
.mobile-card-header small,
.ledger-mobile-card p {
  overflow-wrap: anywhere;
}

.mobile-card-header small,
.ledger-mobile-card p {
  display: block;
  margin: 4px 0 0;
  color: #667586;
}

.mobile-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.usage-page :deep(.el-tabs) {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
  padding: 12px 14px 14px;
}

.usage-ai-section :deep(.el-tabs) {
  border: 0;
  box-shadow: none;
  padding: 0;
}

.usage-page :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.usage-page :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #dbe5ef;
}

.usage-page :deep(.el-tabs__active-bar) {
  background: #2563eb;
}

.usage-page :deep(.el-table) {
  --el-table-fixed-right-column: inset -1px 0 0 #dbe5ef;
}

.usage-page :deep(.el-table__cell) {
  vertical-align: top;
}

@media (max-width: 860px) {
  .toolbar-row {
    flex-direction: column;
  }

  .toolbar-control,
  .date-control {
    width: 100%;
  }

  .usage-section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .ledger-metric-strip,
  .ledger-rank-grid {
    grid-template-columns: 1fr;
  }

  .ledger-date-filter,
  .status-control {
    width: 100%;
  }

  .ledger-desktop-table {
    display: none;
  }

  .ledger-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style>

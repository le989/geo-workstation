<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  getAiUsageSummary,
  getUsageByDepartment,
  getUsageByModule,
  getUsageByUser,
  getUsageSummary,
  getUsageTrends,
  type AiUsageSummary,
  type UsageBreakdownItem,
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

const emptyAiSummary = (): AiUsageSummary => ({
  range: {
    startDate: "",
    endDate: null
  },
  overview: {
    totalCalls: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    tokenKnownCalls: 0,
    tokenUnknownCalls: 0,
    usageUnknownCount: 0,
    knownPromptTokens: 0,
    knownCompletionTokens: 0,
    knownTotalTokens: 0
  },
  byCompany: [],
  byProvider: [],
  byModule: [],
  byUser: [],
  byDepartment: []
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
const activeTab = ref("module");
const activeAiTab = ref("provider");
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
const aiSummary = ref<AiUsageSummary>(emptyAiSummary());

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

const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat("zh-CN").format(value ?? 0);

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

const formatPercent = (value: number | null | undefined) =>
  `${((value ?? 0) * 100).toFixed(1)}%`;

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
      aiSummaryResult
    ] = await Promise.all([
      getUsageSummary(query),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(today) }),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(startOfWeek()) }),
      getUsageSummary({ moduleKey: query.moduleKey, startDate: toDateString(startOfMonth()) }),
      getUsageByModule(query),
      getUsageByUser(query),
      getUsageByDepartment(query),
      getUsageTrends(query),
      getAiUsageSummary(query)
    ]);

    summary.value = summaryResult;
    todaySummary.value = todayResult;
    weekSummary.value = weekResult;
    monthSummary.value = monthResult;
    byModule.value = moduleResult.items;
    byUser.value = userResult.items;
    byDepartment.value = departmentResult.items;
    trends.value = trendResult.items;
    aiSummary.value = aiSummaryResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 使用统计加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadData();
});
</script>

<template>
  <section class="usage-page">
    <div class="toolbar-row">
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
          <small>mock {{ formatNumber(todaySummary.mockRequests) }}</small>
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
          <span>mock 调用</span>
          <strong>{{ formatNumber(summary.mockRequests) }}</strong>
          <small>token 记 0</small>
        </div>
        <div class="metric-card">
          <span>真实调用</span>
          <strong>{{ formatNumber(summary.realRequests) }}</strong>
          <small>预留 Provider</small>
        </div>
      </div>

      <section class="usage-ai-section">
        <div class="usage-section-header">
          <div>
            <p class="section-kicker">AI Usage</p>
            <h2>AI 用量统计</h2>
          </div>
          <el-tag type="info" effect="plain">
            统计区间：{{ aiSummary.range.startDate || "近 30 天" }}
          </el-tag>
        </div>

        <el-alert
          title="AI 用量统计用于查看真实 AI 接口调用情况。部分 Provider 不返回 token，本页会标记为未知，不会伪造成 0。"
          type="info"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="aiSummary.overview.usageUnknownCount > 0"
          title="存在部分真实调用未返回 token 用量，暂不能用于精确成本核算。"
          type="warning"
          show-icon
          :closable="false"
        />

        <div class="metric-grid usage-ai-metrics">
          <div class="metric-card">
            <span>AI 调用总次数</span>
            <strong>{{ formatNumber(aiSummary.overview.totalCalls) }}</strong>
            <small>真实 AI 接口调用</small>
          </div>
          <div class="metric-card">
            <span>成功 / 失败</span>
            <strong>
              {{ formatNumber(aiSummary.overview.successCount) }} /
              {{ formatNumber(aiSummary.overview.failureCount) }}
            </strong>
            <small>成功率 {{ formatPercent(aiSummary.overview.successRate) }}</small>
          </div>
          <div class="metric-card">
            <span>已知 token</span>
            <strong>{{ formatNumber(aiSummary.overview.knownTotalTokens) }}</strong>
            <small>
              输入 {{ formatNumber(aiSummary.overview.knownPromptTokens) }} / 输出
              {{ formatNumber(aiSummary.overview.knownCompletionTokens) }}
            </small>
          </div>
          <div class="metric-card">
            <span>token 未知次数</span>
            <strong>{{ formatNumber(aiSummary.overview.tokenUnknownCalls) }}</strong>
            <small>已知 {{ formatNumber(aiSummary.overview.tokenKnownCalls) }} 次</small>
          </div>
        </div>

        <el-tabs v-model="activeAiTab" class="usage-tabs">
          <el-tab-pane label="Provider 统计" name="provider">
            <el-table :data="aiSummary.byProvider" :loading="loading" border>
              <el-table-column prop="provider" label="Provider" min-width="160" />
              <el-table-column label="模型" min-width="160">
                <template #default="{ row }">{{ row.model ?? "未记录" }}</template>
              </el-table-column>
              <el-table-column prop="totalCalls" label="调用次数" width="120" />
              <el-table-column label="成功 / 失败" width="140">
                <template #default="{ row }">
                  {{ formatNumber(row.successCount) }} / {{ formatNumber(row.failureCount) }}
                </template>
              </el-table-column>
              <el-table-column label="已知 token" width="130">
                <template #default="{ row }">{{ formatNumber(row.knownTotalTokens) }}</template>
              </el-table-column>
              <el-table-column label="未知次数" width="120">
                <template #default="{ row }">未知 {{ formatNumber(row.tokenUnknownCalls) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="功能模块统计" name="module">
            <el-table :data="aiSummary.byModule" :loading="loading" border>
              <el-table-column label="功能模块" min-width="180">
                <template #default="{ row }">{{ getModuleLabel(row.moduleKey) }}</template>
              </el-table-column>
              <el-table-column label="动作" min-width="160">
                <template #default="{ row }">{{ getActionLabel(row.action) }}</template>
              </el-table-column>
              <el-table-column prop="totalCalls" label="调用次数" width="120" />
              <el-table-column label="成功 / 失败" width="140">
                <template #default="{ row }">
                  {{ formatNumber(row.successCount) }} / {{ formatNumber(row.failureCount) }}
                </template>
              </el-table-column>
              <el-table-column label="已知 token" width="130">
                <template #default="{ row }">{{ formatNumber(row.knownTotalTokens) }}</template>
              </el-table-column>
              <el-table-column label="未知次数" width="120">
                <template #default="{ row }">未知 {{ formatNumber(row.tokenUnknownCalls) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="详细统计" name="detail">
            <div class="usage-detail-grid">
              <section>
                <h3>公司统计</h3>
                <el-table :data="aiSummary.byCompany" :loading="loading" border>
                  <el-table-column label="公司" min-width="160">
                    <template #default="{ row }">{{ row.companyName ?? row.companyId ?? "未知公司" }}</template>
                  </el-table-column>
                  <el-table-column prop="totalCalls" label="调用次数" width="110" />
                  <el-table-column label="已知 token" width="120">
                    <template #default="{ row }">{{ formatNumber(row.knownTotalTokens) }}</template>
                  </el-table-column>
                  <el-table-column label="未知" width="100">
                    <template #default="{ row }">{{ formatNumber(row.tokenUnknownCalls) }}</template>
                  </el-table-column>
                </el-table>
              </section>

              <section>
                <h3>用户统计</h3>
                <el-table :data="aiSummary.byUser" :loading="loading" border>
                  <el-table-column label="用户" min-width="180">
                    <template #default="{ row }">{{ row.userName ?? row.userEmail ?? "系统任务" }}</template>
                  </el-table-column>
                  <el-table-column prop="totalCalls" label="调用次数" width="110" />
                  <el-table-column label="已知 token" width="120">
                    <template #default="{ row }">{{ formatNumber(row.knownTotalTokens) }}</template>
                  </el-table-column>
                  <el-table-column label="未知" width="100">
                    <template #default="{ row }">{{ formatNumber(row.tokenUnknownCalls) }}</template>
                  </el-table-column>
                </el-table>
              </section>

              <section>
                <h3>部门统计</h3>
                <el-table :data="aiSummary.byDepartment" :loading="loading" border>
                  <el-table-column label="部门" min-width="180">
                    <template #default="{ row }">
                      {{ row.departmentName ?? row.departmentId ?? "未绑定部门" }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="totalCalls" label="调用次数" width="110" />
                  <el-table-column label="已知 token" width="120">
                    <template #default="{ row }">{{ formatNumber(row.knownTotalTokens) }}</template>
                  </el-table-column>
                  <el-table-column label="未知" width="100">
                    <template #default="{ row }">{{ formatNumber(row.tokenUnknownCalls) }}</template>
                  </el-table-column>
                </el-table>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <el-tabs v-model="activeTab" class="usage-tabs">
        <el-tab-pane label="按模块" name="module">
          <el-table :data="byModule" :loading="loading" border>
            <el-table-column label="模块" min-width="180">
              <template #default="{ row }">{{ getModuleLabel(row.moduleKey) }}</template>
            </el-table-column>
            <el-table-column prop="totalRequests" label="调用次数" width="120" />
            <el-table-column prop="totalTokens" label="Token" width="120" />
            <el-table-column prop="mockRequests" label="Mock" width="120" />
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
            <el-table-column prop="mockRequests" label="Mock" width="120" />
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
            <el-table-column prop="mockRequests" label="Mock" width="120" />
            <el-table-column prop="failureCount" label="失败" width="120" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="趋势" name="trend">
          <el-table :data="trends" :loading="loading" border>
            <el-table-column prop="period" label="周期" min-width="140" />
            <el-table-column prop="totalRequests" label="调用次数" width="120" />
            <el-table-column prop="totalTokens" label="Token" width="120" />
            <el-table-column prop="mockRequests" label="Mock" width="120" />
            <el-table-column prop="realRequests" label="真实" width="120" />
            <el-table-column prop="failureCount" label="失败" width="120" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </template>
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

.toolbar-control {
  width: 210px;
}

.date-control {
  width: 280px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card {
  min-height: 112px;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.metric-card span,
.metric-card small {
  display: block;
  color: var(--el-text-color-secondary);
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: var(--el-text-color-primary);
  font-size: 28px;
  line-height: 1.15;
}

.usage-tabs {
  min-width: 0;
}

.usage-ai-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.usage-section-header h2 {
  margin: 0;
  font-size: 20px;
}

.usage-ai-metrics {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.usage-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.usage-detail-grid h3 {
  margin: 0 0 8px;
  font-size: 15px;
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
}
</style>

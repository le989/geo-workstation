<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import {
  getLogsViewerAiCallLogDetail,
  getLogsViewerAiCallLogs,
  getLogsViewerAiUsageRecordDetail,
  getLogsViewerAiUsageRecords,
  getLogsViewerOperationLogDetail,
  getLogsViewerOperationLogs,
  type LogsViewerAiCallLogDetail,
  type LogsViewerAiCallLogItem,
  type LogsViewerAiUsageRecordDetail,
  type LogsViewerAiUsageRecordItem,
  type LogsViewerMetadataSummary,
  type LogsViewerMetadataSummaryValue,
  type LogsViewerOperationLogDetail,
  type LogsViewerOperationLogItem
} from "@/api/logs-viewer";
import AppErrorState from "@/components/AppErrorState.vue";

type LogsTabKey = "operation" | "usage" | "call";
type DateRangeValue = [string, string] | null;
type SuccessFilterValue = "all" | "success" | "failure";
type MockFilterValue = "all" | "mock" | "real";
type DetailRecord =
  | LogsViewerOperationLogDetail
  | LogsViewerAiUsageRecordDetail
  | LogsViewerAiCallLogDetail;

type DetailRow = {
  label: string;
  value: string;
};

const moduleOptions = [
  { label: "全部模块", value: "" },
  { label: "登录与工作台", value: "dashboard" },
  { label: "部门管理", value: "departments" },
  { label: "知识库", value: "knowledge-bases" },
  { label: "售后问答", value: "aftersales-qa" },
  { label: "GEO 内容", value: "geo-content" },
  { label: "AI 拓词", value: "expansion" },
  { label: "模型覆盖", value: "model-inclusion-records" },
  { label: "GEO 报表", value: "geo-reports" },
  { label: "日志与审计", value: "operation-logs" }
];

const actionOptions = [
  { label: "全部动作", value: "" },
  { label: "登录", value: "login" },
  { label: "新增", value: "create" },
  { label: "编辑", value: "update" },
  { label: "状态变更", value: "status" },
  { label: "AI 生成", value: "ai_generate" },
  { label: "保存候选词", value: "save_candidates" },
  { label: "内容质检", value: "geo_content.article.quality_checked" },
  { label: "发布优化", value: "geo_content.article.optimized" },
  { label: "模型覆盖检测", value: "web_search_check" },
  { label: "导出记录", value: "export" }
];

const providerOptions = [
  { label: "全部 Provider", value: "" },
  { label: "openai_compatible", value: "openai_compatible" },
  { label: "mock", value: "mock" },
  { label: "stub", value: "stub" },
  { label: "deepseek", value: "deepseek" },
  { label: "kimi", value: "kimi" },
  { label: "qwen", value: "qwen" },
  { label: "doubao", value: "doubao" }
];

const purposeOptions = [
  { label: "全部目的", value: "" },
  { label: "GEO 扩词", value: "geo_prompt_ai_expansion" },
  { label: "内容质检", value: "content_quality_check" },
  { label: "发布优化", value: "content_publish_optimization" },
  { label: "模型覆盖检测", value: "model_inclusion_web_search" }
];

const relatedTypeOptions = [
  { label: "全部对象", value: "" },
  { label: "扩词任务", value: "expansion_job" },
  { label: "内容项", value: "content_item" },
  { label: "模型覆盖记录", value: "model_inclusion_record" }
];

const callStatusOptions = [
  { label: "全部状态", value: "" },
  { label: "成功", value: "succeeded" },
  { label: "失败", value: "failed" }
];

const moduleLabelMap = Object.fromEntries(moduleOptions.map((item) => [item.value, item.label]));
const actionLabelMap = Object.fromEntries(actionOptions.map((item) => [item.value, item.label]));
const purposeLabelMap = Object.fromEntries(purposeOptions.map((item) => [item.value, item.label]));
const relatedTypeLabelMap = Object.fromEntries(
  relatedTypeOptions.map((item) => [item.value, item.label])
);
const detailLabelMap: Record<string, string> = {
  companyId: "公司 ID",
  departmentId: "部门 ID",
  userId: "操作人 ID",
  userName: "操作人",
  createdById: "创建人 ID",
  createdByName: "创建人",
  moduleKey: "业务模块",
  action: "操作动作",
  purpose: "调用目的",
  targetType: "对象类型",
  targetId: "对象 ID",
  targetTitle: "对象标题",
  relatedType: "关联类型",
  relatedId: "关联 ID",
  provider: "Provider",
  model: "模型",
  isMock: "是否 Mock",
  isMockInferred: "Mock 推断",
  requestCount: "请求次数",
  requestCountLabel: "请求说明",
  promptTokens: "输入 Token",
  completionTokens: "输出 Token",
  totalTokens: "Token 总计",
  tokenInput: "输入 Token",
  tokenOutput: "输出 Token",
  success: "结果",
  status: "状态",
  errorSummary: "错误摘要",
  metadataKeys: "元数据键",
  metadataSummary: "安全元数据摘要",
  hasIp: "IP 记录",
  hasUserAgent: "UserAgent 记录"
};
const metadataSummaryLabelMap: Record<string, string> = {
  usageUnknown: "用量未知",
  providerReturnedUsage: "Provider 返回用量",
  latencyMs: "延迟",
  errorType: "错误类型"
};
const callStatusTextMap: Record<string, string> = {
  succeeded: "成功",
  failed: "失败",
  pending: "处理中"
};

const activeTab = ref<LogsTabKey>("operation");
const drawerSize = ref("560px");
const detailDrawerVisible = ref(false);
const detailLoading = ref(false);
const detailErrorMessage = ref("");
const detailKind = ref<LogsTabKey>("operation");
const detailRecord = ref<DetailRecord | null>(null);
const detailTarget = ref<{ kind: LogsTabKey; id: string } | null>(null);

const operationFilters = reactive({
  moduleKey: "",
  action: "",
  success: "all" as SuccessFilterValue,
  userId: "",
  page: 1,
  pageSize: 20
});
const operationDateRange = ref<DateRangeValue>(null);
const operationLogs = ref<LogsViewerOperationLogItem[]>([]);
const operationTotal = ref(0);
const operationLoading = ref(false);
const operationErrorMessage = ref("");

const usageFilters = reactive({
  moduleKey: "",
  action: "",
  provider: "",
  isMock: "all" as MockFilterValue,
  success: "all" as SuccessFilterValue,
  userId: "",
  page: 1,
  pageSize: 20
});
const usageDateRange = ref<DateRangeValue>(null);
const usageRecords = ref<LogsViewerAiUsageRecordItem[]>([]);
const usageTotal = ref(0);
const usageLoading = ref(false);
const usageErrorMessage = ref("");

const callFilters = reactive({
  provider: "",
  purpose: "",
  status: "",
  relatedType: "",
  createdById: "",
  page: 1,
  pageSize: 20
});
const callDateRange = ref<DateRangeValue>(null);
const callLogs = ref<LogsViewerAiCallLogItem[]>([]);
const callTotal = ref(0);
const callLoading = ref(false);
const callErrorMessage = ref("");

const currentLoading = computed(() => {
  if (activeTab.value === "operation") {
    return operationLoading.value;
  }
  if (activeTab.value === "usage") {
    return usageLoading.value;
  }
  return callLoading.value;
});

const currentErrorMessage = computed(() => {
  if (activeTab.value === "operation") {
    return operationErrorMessage.value;
  }
  if (activeTab.value === "usage") {
    return usageErrorMessage.value;
  }
  return callErrorMessage.value;
});

const getModuleLabel = (moduleKey?: string | null) =>
  moduleKey ? (moduleLabelMap[moduleKey] ?? moduleKey) : "未归类";

const getActionLabel = (action?: string | null) =>
  action ? (actionLabelMap[action] ?? action) : "未归类";

const getPurposeLabel = (purpose?: string | null) =>
  purpose ? (purposeLabelMap[purpose] ?? purpose) : "未归类";

const getRelatedTypeLabel = (relatedType?: string | null) =>
  relatedType ? (relatedTypeLabelMap[relatedType] ?? relatedType) : "未关联";

const getDetailLabel = (label: string) => detailLabelMap[label] ?? label;

const getMetadataSummaryLabel = (label: string) => metadataSummaryLabelMap[label] ?? label;

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";

const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat("zh-CN").format(value ?? 0);

const formatTokens = (value?: number | null) => {
  const tokenValue = value ?? 0;
  if (tokenValue >= 1000) {
    return `${(tokenValue / 1000).toFixed(1)}k`;
  }

  return formatNumber(tokenValue);
};

const formatNullable = (value?: string | number | boolean | null) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
};

const formatUser = (name?: string | null, id?: string | null) => name ?? id ?? "系统";

const formatProviderModel = (provider?: string | null, model?: string | null) =>
  `${provider || "-"} / ${model || "-"}`;

const formatCallStatusText = (status?: string | null) =>
  status ? (callStatusTextMap[status] ?? status) : "-";

const formatMockDisplay = (isMock: boolean, inferred = false) => {
  if (inferred) {
    return isMock ? "Mock 推断" : "真实 Provider";
  }

  return isMock ? "Mock" : "真实调用";
};

const formatObjectSummary = (type?: string | null, id?: string | null, title?: string | null) => {
  if (title) {
    return title;
  }
  if (type && id) {
    return `${type} / ${id}`;
  }
  return id ?? type ?? "-";
};

const formatError = (errorSummary?: string | null) => errorSummary || "-";

const detailRow = (label: string, value: string): DetailRow => ({ label, value });

const successFilterToBoolean = (value: SuccessFilterValue) => {
  if (value === "all") {
    return undefined;
  }
  return value === "success";
};

const mockFilterToBoolean = (value: MockFilterValue) => {
  if (value === "all") {
    return undefined;
  }
  return value === "mock";
};

const isToday = (createdAt: string) => {
  const date = new Date(createdAt);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const getSuccessTagType = (success: boolean) => (success ? "success" : "danger");

const getCallStatusTagType = (status?: string | null) => {
  if (status === "succeeded") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  return "info";
};

const toDateQuery = (dateRange: DateRangeValue) => ({
  startDate: dateRange?.[0],
  endDate: dateRange?.[1]
});

const operationMetrics = computed(() => {
  const rows = operationLogs.value;
  return [
    { label: "今日操作", value: formatNumber(rows.filter((row) => isToday(row.createdAt)).length) },
    { label: "成功操作", value: formatNumber(rows.filter((row) => row.success).length) },
    { label: "失败操作", value: formatNumber(rows.filter((row) => !row.success).length) },
    { label: "涉及模块", value: formatNumber(new Set(rows.map((row) => row.moduleKey)).size) }
  ];
});

const usageMetrics = computed(() => {
  const rows = usageRecords.value;
  return [
    { label: "今日 AI 使用", value: formatNumber(rows.filter((row) => isToday(row.createdAt)).length) },
    { label: "真实调用", value: formatNumber(rows.filter((row) => !row.isMock).length) },
    { label: "Mock 拦截", value: formatNumber(rows.filter((row) => row.isMock).length) },
    {
      label: "Token 总计",
      value: formatTokens(rows.reduce((sum, row) => sum + row.totalTokens, 0))
    }
  ];
});

const callMetrics = computed(() => {
  const rows = callLogs.value;
  return [
    { label: "接口流水", value: formatNumber(rows.length) },
    { label: "成功调用", value: formatNumber(rows.filter((row) => row.status === "succeeded").length) },
    { label: "失败调用", value: formatNumber(rows.filter((row) => row.status === "failed").length) },
    { label: "真实 Provider 调用", value: formatNumber(rows.filter((row) => !row.isMockInferred).length) }
  ];
});

const activeMetrics = computed(() => {
  if (activeTab.value === "operation") {
    return operationMetrics.value;
  }
  if (activeTab.value === "usage") {
    return usageMetrics.value;
  }
  return callMetrics.value;
});

const buildOperationQuery = () => ({
  moduleKey: operationFilters.moduleKey || undefined,
  action: operationFilters.action || undefined,
  success: successFilterToBoolean(operationFilters.success),
  userId: operationFilters.userId || undefined,
  ...toDateQuery(operationDateRange.value),
  page: operationFilters.page,
  pageSize: operationFilters.pageSize
});

const buildUsageQuery = () => ({
  moduleKey: usageFilters.moduleKey || undefined,
  action: usageFilters.action || undefined,
  provider: usageFilters.provider || undefined,
  isMock: mockFilterToBoolean(usageFilters.isMock),
  success: successFilterToBoolean(usageFilters.success),
  userId: usageFilters.userId || undefined,
  ...toDateQuery(usageDateRange.value),
  page: usageFilters.page,
  pageSize: usageFilters.pageSize
});

const buildCallQuery = () => ({
  provider: callFilters.provider || undefined,
  purpose: callFilters.purpose || undefined,
  status: callFilters.status || undefined,
  relatedType: callFilters.relatedType || undefined,
  createdById: callFilters.createdById || undefined,
  ...toDateQuery(callDateRange.value),
  page: callFilters.page,
  pageSize: callFilters.pageSize
});

const loadOperationLogs = async () => {
  operationLoading.value = true;
  operationErrorMessage.value = "";

  try {
    const result = await getLogsViewerOperationLogs(buildOperationQuery());
    operationLogs.value = result.items;
    operationTotal.value = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作审计加载失败";
    operationErrorMessage.value = message;
    ElMessage.error(message);
  } finally {
    operationLoading.value = false;
  }
};

const loadAiUsageRecords = async () => {
  usageLoading.value = true;
  usageErrorMessage.value = "";

  try {
    const result = await getLogsViewerAiUsageRecords(buildUsageQuery());
    usageRecords.value = result.items;
    usageTotal.value = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : "业务 AI 记录加载失败";
    usageErrorMessage.value = message;
    ElMessage.error(message);
  } finally {
    usageLoading.value = false;
  }
};

const loadAiCallLogs = async () => {
  callLoading.value = true;
  callErrorMessage.value = "";

  try {
    const result = await getLogsViewerAiCallLogs(buildCallQuery());
    callLogs.value = result.items;
    callTotal.value = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : "底层接口日志加载失败";
    callErrorMessage.value = message;
    ElMessage.error(message);
  } finally {
    callLoading.value = false;
  }
};

const loadActiveTab = () => {
  if (activeTab.value === "operation") {
    return loadOperationLogs();
  }
  if (activeTab.value === "usage") {
    return loadAiUsageRecords();
  }
  return loadAiCallLogs();
};

const handleTabChange = (name: string | number) => {
  activeTab.value = String(name) as LogsTabKey;
  void loadActiveTab();
};

const handleSearch = () => {
  if (activeTab.value === "operation") {
    operationFilters.page = 1;
  } else if (activeTab.value === "usage") {
    usageFilters.page = 1;
  } else {
    callFilters.page = 1;
  }

  void loadActiveTab();
};

const resetOperationFilters = () => {
  operationFilters.moduleKey = "";
  operationFilters.action = "";
  operationFilters.success = "all";
  operationFilters.userId = "";
  operationFilters.page = 1;
  operationDateRange.value = null;
};

const resetUsageFilters = () => {
  usageFilters.moduleKey = "";
  usageFilters.action = "";
  usageFilters.provider = "";
  usageFilters.isMock = "all";
  usageFilters.success = "all";
  usageFilters.userId = "";
  usageFilters.page = 1;
  usageDateRange.value = null;
};

const resetCallFilters = () => {
  callFilters.provider = "";
  callFilters.purpose = "";
  callFilters.status = "";
  callFilters.relatedType = "";
  callFilters.createdById = "";
  callFilters.page = 1;
  callDateRange.value = null;
};

const handleReset = () => {
  if (activeTab.value === "operation") {
    resetOperationFilters();
  } else if (activeTab.value === "usage") {
    resetUsageFilters();
  } else {
    resetCallFilters();
  }

  void loadActiveTab();
};

const handlePageChange = (tab: LogsTabKey, page: number) => {
  if (tab === "operation") {
    operationFilters.page = page;
    void loadOperationLogs();
  } else if (tab === "usage") {
    usageFilters.page = page;
    void loadAiUsageRecords();
  } else {
    callFilters.page = page;
    void loadAiCallLogs();
  }
};

const handlePageSizeChange = (tab: LogsTabKey, pageSize: number) => {
  if (tab === "operation") {
    operationFilters.page = 1;
    operationFilters.pageSize = pageSize;
    void loadOperationLogs();
  } else if (tab === "usage") {
    usageFilters.page = 1;
    usageFilters.pageSize = pageSize;
    void loadAiUsageRecords();
  } else {
    callFilters.page = 1;
    callFilters.pageSize = pageSize;
    void loadAiCallLogs();
  }
};

const loadDetail = async (kind: LogsTabKey, id: string) => {
  detailLoading.value = true;
  detailErrorMessage.value = "";
  detailRecord.value = null;

  try {
    if (kind === "operation") {
      detailRecord.value = await getLogsViewerOperationLogDetail(id);
    } else if (kind === "usage") {
      detailRecord.value = await getLogsViewerAiUsageRecordDetail(id);
    } else {
      detailRecord.value = await getLogsViewerAiCallLogDetail(id);
    }
  } catch (error) {
    detailErrorMessage.value = error instanceof Error ? error.message : "日志详情加载失败";
  } finally {
    detailLoading.value = false;
  }
};

const openDetailDrawer = (kind: LogsTabKey, id: string) => {
  // 详情按需加载，列表不携带完整明细，避免把审计摘要页面变成原始日志出口。
  detailKind.value = kind;
  detailTarget.value = { kind, id };
  detailDrawerVisible.value = true;
  void loadDetail(kind, id);
};

const retryLoadDetail = () => {
  if (!detailTarget.value) {
    return;
  }

  void loadDetail(detailTarget.value.kind, detailTarget.value.id);
};

const copyLogId = async () => {
  const logId = detailRecord.value?.id;
  if (!logId) {
    return;
  }

  try {
    await navigator.clipboard.writeText(logId);
    ElMessage.success("Log ID 已复制。");
  } catch {
    ElMessage.warning("当前浏览器不支持自动复制，请手动复制 Log ID。");
  }
};

const formatSummaryValue = (value: LogsViewerMetadataSummaryValue): string => {
  if (value === null) {
    return "-";
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if ("itemCount" in value) {
    return `条目数 ${value.itemCount}`;
  }
  if ("keyCount" in value) {
    return `键数量 ${value.keyCount}${value.keys.length ? `：${value.keys.join("、")}` : ""}`;
  }

  return "-";
};

const formatSafeSummaryRows = (summary?: LogsViewerMetadataSummary): DetailRow[] =>
  Object.entries(summary ?? {}).map(([key, value]) => ({
    label: getMetadataSummaryLabel(key),
    value: formatSummaryValue(value)
  }));

const detailStatusText = computed(() => {
  const record = detailRecord.value;
  if (!record) {
    return "-";
  }
  if (detailKind.value === "call") {
    return formatCallStatusText((record as LogsViewerAiCallLogDetail).status);
  }

  return (record as LogsViewerOperationLogDetail | LogsViewerAiUsageRecordDetail).success
    ? "成功"
    : "失败";
});

const detailStatusTagType = computed(() => {
  const record = detailRecord.value;
  if (!record) {
    return "info";
  }
  if (detailKind.value === "call") {
    return getCallStatusTagType((record as LogsViewerAiCallLogDetail).status);
  }

  return getSuccessTagType((record as LogsViewerOperationLogDetail | LogsViewerAiUsageRecordDetail).success);
});

const basicDetailRows = computed<DetailRow[]>(() => {
  const record = detailRecord.value;
  if (!record) {
    return [];
  }

  if (detailKind.value === "call") {
    const callRecord = record as LogsViewerAiCallLogDetail;
    return [
      detailRow("Log ID", callRecord.id),
      detailRow("时间", formatTime(callRecord.createdAt)),
      detailRow("createdByName", formatUser(callRecord.createdByName, callRecord.createdById)),
      detailRow("companyId", formatNullable(callRecord.companyId)),
      detailRow("purpose", getPurposeLabel(callRecord.purpose))
    ];
  }

  const commonRecord = record as LogsViewerOperationLogDetail | LogsViewerAiUsageRecordDetail;
  return [
    detailRow("Log ID", commonRecord.id),
    detailRow("时间", formatTime(commonRecord.createdAt)),
    detailRow("userName", formatUser(commonRecord.userName, commonRecord.userId)),
    detailRow("companyId", formatNullable(commonRecord.companyId)),
    detailRow("departmentId", formatNullable(commonRecord.departmentId)),
    detailRow("moduleKey", getModuleLabel(commonRecord.moduleKey)),
    detailRow("action", getActionLabel(commonRecord.action))
  ];
});

const objectDetailRows = computed<DetailRow[]>(() => {
  const record = detailRecord.value;
  if (!record) {
    return [];
  }

  if (detailKind.value === "operation") {
    const operationRecord = record as LogsViewerOperationLogDetail;
    return [
      detailRow("targetType", formatNullable(operationRecord.targetType)),
      detailRow("targetId", formatNullable(operationRecord.targetId)),
      detailRow("targetTitle", formatNullable(operationRecord.targetTitle))
    ];
  }

  if (detailKind.value === "call") {
    const callRecord = record as LogsViewerAiCallLogDetail;
    return [
      detailRow("relatedType", getRelatedTypeLabel(callRecord.relatedType)),
      detailRow("relatedId", formatNullable(callRecord.relatedId))
    ];
  }

  return [];
});

const aiDetailRows = computed<DetailRow[]>(() => {
  const record = detailRecord.value;
  if (!record || detailKind.value === "operation") {
    return [];
  }

  if (detailKind.value === "usage") {
    const usageRecord = record as LogsViewerAiUsageRecordDetail;
    return [
      detailRow("provider", usageRecord.provider),
      detailRow("model", formatNullable(usageRecord.model)),
      detailRow("isMock", formatMockDisplay(usageRecord.isMock)),
      detailRow("requestCount", formatNumber(usageRecord.requestCount)),
      detailRow("promptTokens", formatNumber(usageRecord.promptTokens)),
      detailRow("completionTokens", formatNumber(usageRecord.completionTokens)),
      detailRow("totalTokens", formatNumber(usageRecord.totalTokens))
    ];
  }

  const callRecord = record as LogsViewerAiCallLogDetail;
  return [
    detailRow("provider", callRecord.provider),
    detailRow("model", callRecord.model),
    detailRow("isMockInferred", formatMockDisplay(callRecord.isMockInferred, true)),
    detailRow("requestCountLabel", callRecord.requestCountLabel),
    detailRow("tokenInput", formatNullable(callRecord.tokenInput)),
    detailRow("tokenOutput", formatNullable(callRecord.tokenOutput))
  ];
});

const securityDetailRows = computed<DetailRow[]>(() => {
  const record = detailRecord.value;
  if (!record) {
    return [];
  }

  if (detailKind.value === "operation") {
    const operationRecord = record as LogsViewerOperationLogDetail;
    return [
      detailRow("errorSummary", formatError(operationRecord.errorSummary)),
      detailRow("hasIp", operationRecord.hasIp ? "已记录" : "未记录"),
      detailRow("hasUserAgent", operationRecord.hasUserAgent ? "已记录" : "未记录")
    ];
  }

  if (detailKind.value === "usage") {
    const usageRecord = record as LogsViewerAiUsageRecordDetail;
    return [detailRow("errorSummary", formatError(usageRecord.errorSummary))];
  }

  return [];
});

const metadataKeyList = computed(() => {
  if (detailKind.value !== "operation" || !detailRecord.value) {
    return [];
  }

  return (detailRecord.value as LogsViewerOperationLogDetail).metadataKeys;
});

const metadataSummaryRows = computed(() => {
  if (!detailRecord.value || detailKind.value === "call") {
    return [];
  }

  return formatSafeSummaryRows(
    (detailRecord.value as LogsViewerOperationLogDetail | LogsViewerAiUsageRecordDetail)
      .metadataSummary
  );
});

const updateDrawerSize = () => {
  drawerSize.value = window.matchMedia("(max-width: 760px)").matches ? "100%" : "560px";
};

onMounted(() => {
  updateDrawerSize();
  window.addEventListener("resize", updateDrawerSize);
  void loadOperationLogs();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateDrawerSize);
});
</script>

<template>
  <section class="logs-viewer-page">
    <header class="logs-viewer-hero">
      <div>
        <h1>日志与审计</h1>
        <p>查看系统操作记录、AI 模块使用情况和底层接口调度流水。不包含敏感正文或密钥。</p>
      </div>
      <el-tag effect="plain" type="info">仅含安全摘要</el-tag>
    </header>

    <el-tabs v-model="activeTab" class="logs-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="操作审计" name="operation" />
      <el-tab-pane label="业务 AI 记录" name="usage" />
      <el-tab-pane label="底层接口日志" name="call" />
    </el-tabs>

    <section class="metric-strip" aria-label="当前页统计">
      <div v-for="metric in activeMetrics" :key="metric.label" class="metric-strip__item">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </div>
      <span v-if="currentLoading" class="loading-note">正在加载日志数据</span>
    </section>

    <section class="filter-panel">
      <el-form v-if="activeTab === 'operation'" inline class="compact-filter-form">
        <el-form-item label="时间范围" class="date-filter-item">
          <el-date-picker
            v-model="operationDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="date-control"
          />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="operationFilters.success" class="status-control">
            <el-option label="全部" value="all" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failure" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="operationFilters.userId" class="id-control" clearable />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="operationFilters.moduleKey" class="toolbar-control" filterable>
            <el-option
              v-for="item in moduleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="动作">
          <el-select v-model="operationFilters.action" class="toolbar-control" filterable>
            <el-option
              v-for="item in actionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-form v-else-if="activeTab === 'usage'" inline class="compact-filter-form">
        <el-form-item label="时间范围" class="date-filter-item">
          <el-date-picker
            v-model="usageDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="date-control"
          />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="usageFilters.success" class="status-control">
            <el-option label="全部" value="all" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failure" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="usageFilters.userId" class="id-control" clearable />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="usageFilters.moduleKey" class="toolbar-control" filterable>
            <el-option
              v-for="item in moduleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Provider">
          <el-select v-model="usageFilters.provider" class="toolbar-control" filterable>
            <el-option
              v-for="item in providerOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Mock">
          <el-select v-model="usageFilters.isMock" class="status-control">
            <el-option label="全部" value="all" />
            <el-option label="Mock" value="mock" />
            <el-option label="真实" value="real" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-form v-else inline class="compact-filter-form">
        <el-form-item label="时间范围" class="date-filter-item">
          <el-date-picker
            v-model="callDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="date-control"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="callFilters.status" class="status-control">
            <el-option
              v-for="item in callStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="创建人">
          <el-input v-model="callFilters.createdById" class="id-control" clearable />
        </el-form-item>
        <el-form-item label="Provider">
          <el-select v-model="callFilters.provider" class="toolbar-control" filterable>
            <el-option
              v-for="item in providerOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目的">
          <el-select v-model="callFilters.purpose" class="toolbar-control" filterable>
            <el-option
              v-for="item in purposeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联类型">
          <el-select v-model="callFilters.relatedType" class="toolbar-control" filterable>
            <el-option
              v-for="item in relatedTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <div class="filter-actions">
        <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </section>

    <AppErrorState v-if="currentErrorMessage" :message="currentErrorMessage" @retry="loadActiveTab" />

    <section v-else class="logs-table-panel">
      <template v-if="activeTab === 'operation'">
        <div class="desktop-table">
          <el-table :data="operationLogs" :loading="operationLoading" border class="logs-table">
            <el-table-column label="时间 / 操作人" min-width="190">
              <template #default="{ row }">
                <div class="stacked-cell">
                  <strong>{{ formatTime(row.createdAt) }}</strong>
                  <span>{{ formatUser(row.userName, row.userId) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="业务模块" min-width="130">
              <template #default="{ row }">{{ getModuleLabel(row.moduleKey) }}</template>
            </el-table-column>
            <el-table-column label="操作 / 对象" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="stacked-cell">
                  <strong>{{ getActionLabel(row.action) }}</strong>
                  <span>{{ formatObjectSummary(row.targetType, row.targetId, row.targetTitle) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="getSuccessTagType(row.success)" effect="plain">
                  {{ row.success ? "成功" : "失败" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="错误摘要" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ formatError(row.errorSummary) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="openDetailDrawer('operation', row.id)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无日志记录" />
            </template>
          </el-table>
        </div>

        <div class="mobile-card-list">
          <article v-for="row in operationLogs" :key="row.id" class="log-mobile-card">
            <div class="mobile-card-head">
              <strong>{{ getActionLabel(row.action) }}</strong>
              <el-tag :type="getSuccessTagType(row.success)" effect="plain">
                {{ row.success ? "成功" : "失败" }}
              </el-tag>
            </div>
            <p>{{ formatTime(row.createdAt) }} · {{ formatUser(row.userName, row.userId) }}</p>
            <p>{{ getModuleLabel(row.moduleKey) }}</p>
            <p>{{ formatObjectSummary(row.targetType, row.targetId, row.targetTitle) }}</p>
            <el-button text type="primary" @click="openDetailDrawer('operation', row.id)">
              查看详情
            </el-button>
          </article>
          <el-empty v-if="!operationLoading && !operationLogs.length" description="暂无日志记录" />
        </div>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="operationFilters.page"
            v-model:page-size="operationFilters.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="operationTotal"
            @current-change="handlePageChange('operation', $event)"
            @size-change="handlePageSizeChange('operation', $event)"
          />
        </div>
      </template>

      <template v-else-if="activeTab === 'usage'">
        <div class="desktop-table">
          <el-table :data="usageRecords" :loading="usageLoading" border class="logs-table">
            <el-table-column label="时间 / 操作人" min-width="190">
              <template #default="{ row }">
                <div class="stacked-cell">
                  <strong>{{ formatTime(row.createdAt) }}</strong>
                  <span>{{ formatUser(row.userName, row.userId) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="使用模块" min-width="180">
              <template #default="{ row }">
                <div class="stacked-cell">
                  <strong>{{ getModuleLabel(row.moduleKey) }}</strong>
                  <span>{{ getActionLabel(row.action) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="模型 / 状态" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="tag-stack">
                  <span class="provider-model-text" :title="formatProviderModel(row.provider, row.model)">
                    {{ formatProviderModel(row.provider, row.model) }}
                  </span>
                  <div>
                    <el-tag size="small" :type="row.isMock ? 'info' : 'warning'" effect="plain">
                      {{ formatMockDisplay(row.isMock) }}
                    </el-tag>
                    <el-tag size="small" :type="getSuccessTagType(row.success)" effect="plain">
                      {{ row.success ? "成功" : "失败" }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用量" min-width="180">
              <template #default="{ row }">
                请求 {{ formatNumber(row.requestCount) }} 次 / {{ formatTokens(row.totalTokens) }} Tokens
              </template>
            </el-table-column>
            <el-table-column label="错误摘要" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ formatError(row.errorSummary) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="openDetailDrawer('usage', row.id)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无日志记录" />
            </template>
          </el-table>
        </div>

        <div class="mobile-card-list">
          <article v-for="row in usageRecords" :key="row.id" class="log-mobile-card">
            <div class="mobile-card-head">
              <strong>{{ getModuleLabel(row.moduleKey) }}</strong>
              <el-tag :type="getSuccessTagType(row.success)" effect="plain">
                {{ row.success ? "成功" : "失败" }}
              </el-tag>
            </div>
            <p>{{ formatTime(row.createdAt) }} · {{ formatUser(row.userName, row.userId) }}</p>
            <p class="provider-model-text" :title="formatProviderModel(row.provider, row.model)">
              {{ formatProviderModel(row.provider, row.model) }}
            </p>
            <p>请求 {{ formatNumber(row.requestCount) }} 次 / {{ formatTokens(row.totalTokens) }} Tokens</p>
            <el-button text type="primary" @click="openDetailDrawer('usage', row.id)">
              查看详情
            </el-button>
          </article>
          <el-empty v-if="!usageLoading && !usageRecords.length" description="暂无日志记录" />
        </div>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="usageFilters.page"
            v-model:page-size="usageFilters.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="usageTotal"
            @current-change="handlePageChange('usage', $event)"
            @size-change="handlePageSizeChange('usage', $event)"
          />
        </div>
      </template>

      <template v-else>
        <div class="desktop-table">
          <el-table :data="callLogs" :loading="callLoading" border class="logs-table">
            <el-table-column label="时间 / 创建人" min-width="190">
              <template #default="{ row }">
                <div class="stacked-cell">
                  <strong>{{ formatTime(row.createdAt) }}</strong>
                  <span>{{ formatUser(row.createdByName, row.createdById) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="调用目的" min-width="180">
              <template #default="{ row }">{{ getPurposeLabel(row.purpose) }}</template>
            </el-table-column>
            <el-table-column label="Provider / Model" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="tag-stack">
                  <span class="provider-model-text" :title="formatProviderModel(row.provider, row.model)">
                    {{ formatProviderModel(row.provider, row.model) }}
                  </span>
                  <el-tag size="small" :type="row.isMockInferred ? 'info' : 'warning'" effect="plain">
                    {{ formatMockDisplay(row.isMockInferred, true) }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态 / Token" min-width="160">
              <template #default="{ row }">
                <div class="stacked-cell">
                  <el-tag :type="getCallStatusTagType(row.status)" effect="plain">
                    {{ formatCallStatusText(row.status) }}
                  </el-tag>
                  <span>输入 {{ formatNullable(row.tokenInput) }} / 输出 {{ formatNullable(row.tokenOutput) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Request Count" min-width="150">
              <template #default="{ row }">{{ row.requestCountLabel }}</template>
            </el-table-column>
            <el-table-column label="关联对象" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ getRelatedTypeLabel(row.relatedType) }} / {{ row.relatedId || "-" }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="openDetailDrawer('call', row.id)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无日志记录" />
            </template>
          </el-table>
        </div>

        <div class="mobile-card-list">
          <article v-for="row in callLogs" :key="row.id" class="log-mobile-card">
            <div class="mobile-card-head">
              <strong>{{ getPurposeLabel(row.purpose) }}</strong>
              <el-tag :type="getCallStatusTagType(row.status)" effect="plain">
                {{ formatCallStatusText(row.status) }}
              </el-tag>
            </div>
            <p>{{ formatTime(row.createdAt) }} · {{ formatUser(row.createdByName, row.createdById) }}</p>
            <p class="provider-model-text" :title="formatProviderModel(row.provider, row.model)">
              {{ formatProviderModel(row.provider, row.model) }}
            </p>
            <p>{{ getRelatedTypeLabel(row.relatedType) }} / {{ row.relatedId || "-" }}</p>
            <el-button text type="primary" @click="openDetailDrawer('call', row.id)">
              查看详情
            </el-button>
          </article>
          <el-empty v-if="!callLoading && !callLogs.length" description="暂无日志记录" />
        </div>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="callFilters.page"
            v-model:page-size="callFilters.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            :total="callTotal"
            @current-change="handlePageChange('call', $event)"
            @size-change="handlePageSizeChange('call', $event)"
          />
        </div>
      </template>
    </section>

    <el-drawer
      v-model="detailDrawerVisible"
      title="日志详情"
      :size="drawerSize"
      class="logs-detail-drawer"
    >
      <AppErrorState
        v-if="detailErrorMessage"
        :message="detailErrorMessage"
        @retry="retryLoadDetail"
      />
      <section v-else-if="detailLoading" class="detail-loading">
        <p>正在加载日志详情</p>
        <el-skeleton animated :rows="4" />
      </section>
      <section v-else-if="detailRecord" class="detail-content">
        <div class="detail-highlight">
          <el-tag :type="detailStatusTagType" effect="plain">{{ detailStatusText }}</el-tag>
          <span>{{ formatTime(detailRecord.createdAt) }}</span>
          <code>{{ detailRecord.id }}</code>
          <el-button size="small" type="primary" plain @click="copyLogId">复制 Log ID</el-button>
        </div>

        <section class="detail-section">
          <h3>基础信息</h3>
          <dl class="detail-grid">
            <template v-for="row in basicDetailRows" :key="row.label">
              <dt>{{ getDetailLabel(row.label) }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </section>

        <section v-if="objectDetailRows.length" class="detail-section">
          <h3>业务对象</h3>
          <dl class="detail-grid">
            <template v-for="row in objectDetailRows" :key="row.label">
              <dt>{{ getDetailLabel(row.label) }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </section>

        <section v-if="aiDetailRows.length" class="detail-section">
          <h3>AI 调度信息</h3>
          <dl class="detail-grid">
            <template v-for="row in aiDetailRows" :key="row.label">
              <dt>{{ getDetailLabel(row.label) }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>
        </section>

        <section class="detail-section">
          <h3>安全与审计信息</h3>
          <dl class="detail-grid">
            <template v-for="row in securityDetailRows" :key="row.label">
              <dt>{{ getDetailLabel(row.label) }}</dt>
              <dd>{{ row.value }}</dd>
            </template>
          </dl>

          <div v-if="metadataKeyList.length" class="safe-summary-block">
            <span>安全摘要字段</span>
            <div class="safe-tag-list">
              <el-tag v-for="key in metadataKeyList" :key="key" size="small" effect="plain">
                {{ getMetadataSummaryLabel(key) }}
              </el-tag>
            </div>
          </div>

          <div v-if="metadataSummaryRows.length" class="safe-summary-block">
            <span>白名单摘要</span>
            <dl class="detail-grid">
              <template v-for="row in metadataSummaryRows" :key="row.label">
                <dt>{{ getDetailLabel(row.label) }}</dt>
                <dd>{{ row.value }}</dd>
              </template>
            </dl>
          </div>
        </section>
      </section>
    </el-drawer>
  </section>
</template>

<style scoped>
.logs-viewer-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.logs-viewer-hero,
.filter-panel,
.metric-strip,
.logs-table-panel {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.logs-viewer-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.logs-viewer-hero h1 {
  margin: 0;
  color: #172331;
  font-size: 22px;
  line-height: 1.3;
}

.logs-viewer-hero p {
  margin: 6px 0 0;
  color: #526173;
  line-height: 1.6;
}

.logs-tabs {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 16px;
}

.logs-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.metric-strip {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 58px;
  padding: 10px 16px;
}

.metric-strip__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 120px;
}

.metric-strip__item span,
.loading-note {
  color: #64748b;
  font-size: 13px;
}

.metric-strip__item strong {
  color: #172331;
  font-size: 18px;
}

.loading-note {
  margin-left: auto;
}

.filter-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
}

.compact-filter-form {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.compact-filter-form :deep(.el-form-item) {
  margin: 0;
}

.compact-filter-form :deep(.el-input__wrapper),
.compact-filter-form :deep(.el-select__wrapper) {
  background: #f8fafc;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.toolbar-control {
  width: 180px;
}

.status-control {
  width: 120px;
}

.id-control {
  width: 190px;
}

.date-control {
  width: 320px;
}

.date-filter-item {
  min-width: 320px;
}

.date-filter-item :deep(.el-form-item__content) {
  min-width: 0;
}

.logs-table-panel {
  overflow: hidden;
  padding: 14px;
}

.logs-table :deep(.el-table__cell) {
  vertical-align: top;
}

.logs-table :deep(.cell) {
  word-break: break-word;
}

.stacked-cell,
.tag-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stacked-cell strong,
.tag-stack span {
  color: #172331;
  font-weight: 700;
}

.stacked-cell span {
  color: #64748b;
  font-size: 12px;
}

.tag-stack > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-model-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.mobile-card-list {
  display: none;
}

.log-mobile-card {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.log-mobile-card + .log-mobile-card {
  margin-top: 10px;
}

.mobile-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.log-mobile-card p {
  margin: 8px 0 0;
  color: #526173;
  font-size: 13px;
  line-height: 1.5;
}

.detail-loading,
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-highlight,
.detail-section {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
}

.detail-highlight {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
}

.detail-highlight code {
  border-radius: 6px;
  background: #eef4fb;
  color: #172331;
  padding: 4px 8px;
  word-break: break-all;
}

.detail-section {
  padding: 14px;
}

.detail-section h3 {
  margin: 0 0 12px;
  color: #172331;
  font-size: 15px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 8px 12px;
  margin: 0;
}

.detail-grid dt {
  color: #64748b;
  font-weight: 600;
}

.detail-grid dd {
  margin: 0;
  color: #172331;
  word-break: break-word;
}

.safe-summary-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
}

.safe-summary-block > span {
  color: #64748b;
  font-weight: 700;
}

.safe-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 960px) {
  .logs-viewer-hero,
  .filter-panel {
    flex-direction: column;
  }

  .metric-strip {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .metric-strip__item {
    min-width: calc(50% - 12px);
  }

  .filter-actions {
    width: 100%;
  }

  .filter-actions .el-button {
    flex: 1;
  }

  .toolbar-control,
  .status-control,
  .id-control,
  .date-control {
    width: 100%;
  }

  .date-filter-item {
    flex: 1 1 100%;
    min-width: 0;
    width: 100%;
  }

  .date-filter-item :deep(.el-form-item__content),
  .date-filter-item :deep(.el-date-editor--daterange) {
    width: 100%;
    max-width: 100%;
  }
}

@media (max-width: 760px) {
  .desktop-table {
    display: none;
  }

  .mobile-card-list {
    display: block;
  }

  .pagination-row {
    justify-content: center;
    overflow-x: auto;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .log-mobile-card .provider-model-text {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 480px) {
  .date-filter-item :deep(.el-form-item__label) {
    width: 100%;
    justify-content: flex-start;
  }

  .date-filter-item :deep(.el-range-input) {
    min-width: 0;
  }
}
</style>

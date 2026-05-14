<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { GeoPrompt, GeoPromptQuery } from "@/api/geo-prompts";
import { getGeoPrompts } from "@/api/geo-prompts";
import type {
  FailedWebSearchCheckItem,
  ModelInclusionRecord,
  ProviderErrorCategory,
  WebSearchCheckPayload,
  WebSearchCheckResult
} from "@/api/model-inclusion";
import { getProjectProfile } from "@/api/project-profile";
import { geoPromptTypeOptions, userIntentLabelMap } from "@/config/geo-prompt-options";
import { hitLevelLabelMap } from "@/config/model-inclusion-options";

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  errorMessage?: string;
  result?: WebSearchCheckResult | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: WebSearchCheckPayload];
}>();

const promptCandidates = ref<GeoPrompt[]>([]);
const promptTotal = ref(0);
const promptLoading = ref(false);
const selectedPromptIds = ref<string[]>([]);
const filters = reactive<GeoPromptQuery>({
  page: 1,
  pageSize: 20,
  trackEnabled: true
});
const form = reactive({
  provider: "kimi_web_search" as WebSearchCheckPayload["provider"],
  model: "",
  brandName: "",
  companyName: "",
  websiteUrl: ""
});

const providerOptions: Array<{
  label: string;
  value: WebSearchCheckPayload["provider"];
}> = [
  {
    label: "Kimi 联网搜索",
    value: "kimi_web_search"
  },
  {
    label: "豆包 / 火山方舟联网搜索",
    value: "volcengine_web_search"
  },
  {
    label: "通义千问 / 阿里云百炼联网搜索",
    value: "aliyun_bailian_web_search"
  }
];

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value)
});

const trimOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const loadProjectProfile = async () => {
  const profile = await getProjectProfile();

  if (!form.brandName && profile?.brandName) {
    form.brandName = profile.brandName;
  }
  if (!form.companyName && profile?.companyName) {
    form.companyName = profile.companyName;
  }
  if (!form.websiteUrl && profile?.websiteUrl) {
    form.websiteUrl = profile.websiteUrl;
  }
};

const loadPromptCandidates = async () => {
  promptLoading.value = true;

  try {
    const result = await getGeoPrompts({
      page: filters.page,
      pageSize: filters.pageSize,
      priority: filters.priority,
      productLine: trimOptional(filters.productLine),
      search: trimOptional(filters.search),
      trackEnabled: filters.trackEnabled,
      type: filters.type,
      userIntent: filters.userIntent
    });
    promptCandidates.value = result.items;
    promptTotal.value = result.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "提示词加载失败。");
    promptCandidates.value = [];
    promptTotal.value = 0;
  } finally {
    promptLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      void Promise.all([loadProjectProfile(), loadPromptCandidates()]);
    }
  }
);

const handleSelectionChange = (rows: GeoPrompt[]) => {
  if (rows.length > 20) {
    ElMessage.warning("第一版最多选择 20 条提示词，请先检测少量高优先级提示词。");
  }

  selectedPromptIds.value = rows.slice(0, 20).map((row) => row.id);
};

const handleSearch = () => {
  filters.page = 1;
  void loadPromptCandidates();
};

const handleReset = () => {
  Object.assign(filters, {
    page: 1,
    pageSize: 20,
    priority: undefined,
    productLine: undefined,
    search: undefined,
    trackEnabled: true,
    type: undefined,
    userIntent: undefined
  });
  selectedPromptIds.value = [];
  void loadPromptCandidates();
};

const submit = () => {
  if (selectedPromptIds.value.length === 0) {
    ElMessage.warning("请先选择要检测的 GEO 提示词。");
    return;
  }

  emit("submit", {
    geoPromptIds: selectedPromptIds.value,
    provider: form.provider,
    model: trimOptional(form.model),
    brandName: trimOptional(form.brandName),
    companyName: trimOptional(form.companyName),
    websiteUrl: trimOptional(form.websiteUrl),
    entryPoint: "web_search_api",
    isLoggedIn: false,
    limit: 20
  });
};

const providerBoundaryTitle = computed(() => {
  if (form.provider === "volcengine_web_search") {
    return "当前为火山方舟 Web Search API 检测，作为豆包 / 火山生态方向联网检测入口；不等同于豆包 App 端真实用户结果。火山方舟 Web Search 可能耗时较长，当前检测会限制为短回答，适合判断品牌提及和官网引用，不适合生成长篇内容；可能不返回结构化引用来源。每次检测会消耗 API 额度，建议先少量检测。";
  }

  if (form.provider === "aliyun_bailian_web_search") {
    return "当前为阿里云百炼 / 通义 Web Search API 检测，不等同于通义千问 App 或网页端真实用户结果。当前 Provider 可能不返回结构化引用来源，官网引用主要从回答正文中判断。每次检测会消耗 API 额度，建议先少量检测。";
  }

  return "当前是 Kimi Web Search API 检测，不等同于 Kimi App 端真实用户结果；不是 App 端真实用户结果。每次检测会消耗 API 额度，建议先检测少量高优先级提示词。";
});

const providerModelPlaceholder = computed(() => {
  if (form.provider === "volcengine_web_search") {
    return "默认使用后端 VOLCENGINE_WEB_SEARCH_MODEL";
  }

  if (form.provider === "aliyun_bailian_web_search") {
    return "默认使用后端 ALIYUN_BAILIAN_MODEL";
  }

  return "默认使用后端 KIMI_MODEL";
});

const formatHitLevel = (value?: string) =>
  value ? ((hitLevelLabelMap as Record<string, string>)[value] ?? value) : "无法判断";

const formatUserIntent = (prompt: GeoPrompt) =>
  userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent;

const errorCategoryLabelMap: Record<ProviderErrorCategory, string> = {
  network_timeout: "网络超时",
  network_fetch_failed: "网络请求失败",
  network_connection_reset: "连接重置",
  provider_auth_error: "鉴权错误",
  provider_rate_limit: "限流",
  provider_insufficient_balance: "余额不足",
  provider_model_error: "模型错误",
  provider_tool_error: "工具调用错误",
  provider_incomplete_output: "输出不完整",
  provider_response_parse_error: "响应解析错误",
  provider_bad_request: "请求参数错误",
  provider_unknown: "未知错误"
};

type ResultRow = Partial<ModelInclusionRecord> & {
  status: "success" | "failed";
  promptText?: string;
  errorMessage?: string;
  errorCategory?: ProviderErrorCategory;
  retryCount?: number;
};

const getFailureRecord = (item: FailedWebSearchCheckItem): ResultRow => ({
  ...(item.record ?? {}),
  status: "failed",
  promptText: item.record?.geoPrompt?.promptText ?? item.promptText,
  errorMessage: item.errorMessage,
  errorCategory: item.errorCategory ?? item.record?.errorCategory,
  retryCount: item.retryCount ?? item.record?.retryCount ?? 0
});

const resultRows = computed<ResultRow[]>(() => {
  if (!props.result) {
    return [];
  }

  return [
    ...props.result.createdItems.map((item) => ({
      ...item,
      status: "success" as const,
      retryCount: item.retryCount ?? 0
    })),
    ...props.result.failedItems.map((item) => getFailureRecord(item))
  ];
});

const formatErrorCategory = (value?: ProviderErrorCategory) =>
  value ? (errorCategoryLabelMap[value] ?? value) : "无";

const formatRetryStatus = (value?: number) =>
  value && value > 0 ? `已重试 ${value} 次` : "未重试";

const getFailureHelpText = (value?: ProviderErrorCategory) => {
  if (
    value === "network_timeout" ||
    value === "network_fetch_failed" ||
    value === "network_connection_reset"
  ) {
    return "网络或联网搜索超时，可稍后重试。";
  }

  if (
    value === "provider_auth_error" ||
    value === "provider_insufficient_balance" ||
    value === "provider_model_error" ||
    value === "provider_rate_limit"
  ) {
    return "请检查后端环境变量、账户额度或模型配置。";
  }

  if (value === "provider_incomplete_output") {
    return "火山 Web Search 已触发搜索但未返回最终回答，可提高输出 tokens 或缩短输出要求。";
  }

  if (value === "provider_response_parse_error") {
    return "Provider 返回结构暂不符合预期，请检查响应结构后再处理。";
  }

  return value ? "请查看错误原因后再决定是否重试。" : "";
};
</script>

<template>
  <el-dialog v-model="visible" title="联网 GEO 命中检测" width="1080px">
    <div class="web-search-dialog">
      <el-alert :title="providerBoundaryTitle" type="warning" :closable="false" show-icon />

      <el-form class="web-search-settings" label-position="top">
        <el-form-item label="Provider">
          <el-select v-model="form.provider">
            <el-option
              v-for="option in providerOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="入口">
          <el-input model-value="联网搜索 API" disabled />
        </el-form-item>
        <el-form-item label="是否联网">
          <el-input model-value="是" disabled />
        </el-form-item>
        <el-form-item label="是否登录">
          <el-input model-value="否" disabled />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" clearable :placeholder="providerModelPlaceholder" />
        </el-form-item>
        <el-form-item label="品牌名">
          <el-input v-model="form.brandName" clearable placeholder="默认读取项目档案 brandName" />
        </el-form-item>
        <el-form-item label="公司名">
          <el-input
            v-model="form.companyName"
            clearable
            placeholder="默认读取项目档案 companyName"
          />
        </el-form-item>
        <el-form-item label="官网">
          <el-input v-model="form.websiteUrl" clearable placeholder="默认读取项目档案 websiteUrl" />
        </el-form-item>
      </el-form>

      <el-divider content-position="left">选择提示词</el-divider>

      <el-form class="web-search-prompt-filters" label-position="top">
        <el-form-item label="搜索提示词">
          <el-input
            v-model="filters.search"
            clearable
            placeholder="搜索提示词、训练词、场景或来源"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="产品线">
          <el-input v-model="filters.productLine" clearable placeholder="产品线" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部类型">
            <el-option
              v-for="option in geoPromptTypeOptions"
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
        <el-form-item label="是否追踪">
          <el-select v-model="filters.trackEnabled" clearable placeholder="全部">
            <el-option label="追踪" :value="true" />
            <el-option label="不追踪" :value="false" />
          </el-select>
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" :loading="promptLoading" @click="handleSearch">
            查询提示词
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </el-form>

      <el-table
        v-loading="promptLoading"
        :data="promptCandidates"
        row-key="id"
        border
        max-height="320"
        empty-text="暂无可检测提示词"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="提示词" min-width="320">
          <template #default="{ row }">
            <strong>{{ row.promptText }}</strong>
            <p class="table-subtext">建议先检测少量高优先级提示词。</p>
          </template>
        </el-table-column>
        <el-table-column prop="productLine" label="产品线" width="150" />
        <el-table-column label="用户意图" width="150">
          <template #default="{ row }">{{ formatUserIntent(row) }}</template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">P{{ row.priority }}</template>
        </el-table-column>
        <el-table-column label="追踪" width="90">
          <template #default="{ row }">
            <el-tag :type="row.trackEnabled ? 'success' : 'info'" effect="plain">
              {{ row.trackEnabled ? "追踪" : "不追踪" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <p class="table-subtext">
        已选择 {{ selectedPromptIds.length }} / 20 条，当前筛选共 {{ promptTotal }} 条。
      </p>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon />

      <el-card v-if="result" shadow="never" class="web-search-result-card">
        <template #header>
          <div class="table-card-header">
            <div>
              <p class="section-kicker">检测完成</p>
              <h3>联网检测结果</h3>
            </div>
            <strong>成功 {{ result.successCount }} 条 / 失败 {{ result.failedCount }} 条</strong>
          </div>
        </template>
        <el-alert
          v-if="result.failedItems.length"
          class="web-search-failure-alert"
          title="存在联网检测失败项"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            失败原因分类已列出。网络或联网搜索超时，可稍后重试。请检查后端环境变量、账户额度或模型配置。
          </template>
        </el-alert>
        <el-table :data="resultRows" border>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="plain">
                {{ row.status === "success" ? "成功" : "失败" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提示词" min-width="260">
            <template #default="{ row }">
              {{ row?.geoPrompt?.promptText || row?.promptText }}
            </template>
          </el-table-column>
          <el-table-column label="命中等级" width="120">
            <template #default="{ row }">{{ formatHitLevel(row?.hitLevel) }}</template>
          </el-table-column>
          <el-table-column label="提及" width="90">
            <template #default="{ row }">{{ row?.brandMentioned ? "是" : "否" }}</template>
          </el-table-column>
          <el-table-column label="推荐" width="90">
            <template #default="{ row }">{{ row?.brandRecommended ? "是" : "否" }}</template>
          </el-table-column>
          <el-table-column label="引用官网" width="100">
            <template #default="{ row }">{{ row?.citedOfficialSite ? "是" : "否" }}</template>
          </el-table-column>
          <el-table-column label="失败原因分类" width="130">
            <template #default="{ row }">{{ formatErrorCategory(row?.errorCategory) }}</template>
          </el-table-column>
          <el-table-column label="重试" width="110">
            <template #default="{ row }">{{ formatRetryStatus(row?.retryCount) }}</template>
          </el-table-column>
          <el-table-column label="错误原因" min-width="280">
            <template #default="{ row }">
              <span>{{ row?.errorMessage || "无" }}</span>
              <p v-if="row?.errorCategory" class="table-subtext">
                {{ getFailureHelpText(row.errorCategory) }}
              </p>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">开始联网检测</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { GeoPrompt, GeoPromptQuery } from "@/api/geo-prompts";
import { getGeoPrompts } from "@/api/geo-prompts";
import type { WebSearchCheckPayload, WebSearchCheckResult } from "@/api/model-inclusion";
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
  provider: "kimi_web_search" as const,
  model: "",
  brandName: "",
  companyName: "",
  websiteUrl: ""
});

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
    provider: "kimi_web_search",
    model: trimOptional(form.model),
    brandName: trimOptional(form.brandName),
    companyName: trimOptional(form.companyName),
    websiteUrl: trimOptional(form.websiteUrl),
    entryPoint: "web_search_api",
    isLoggedIn: false,
    limit: 20
  });
};

const formatHitLevel = (value?: string) =>
  value ? ((hitLevelLabelMap as Record<string, string>)[value] ?? value) : "无法判断";

const formatUserIntent = (prompt: GeoPrompt) =>
  userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent;
</script>

<template>
  <el-dialog v-model="visible" title="Kimi Web Search 联网检测" width="1080px">
    <div class="web-search-dialog">
      <el-alert
        title="当前是 Kimi Web Search API 检测，不等同于 Kimi App 端真实用户结果；不是 App 端真实用户结果。每次检测会消耗 API 额度，建议先检测少量高优先级提示词。"
        type="warning"
        :closable="false"
        show-icon
      />

      <el-form class="web-search-settings" label-position="top">
        <el-form-item label="Provider">
          <el-select v-model="form.provider" disabled>
            <el-option label="Kimi 联网搜索" value="kimi_web_search" />
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
          <el-input v-model="form.model" clearable placeholder="默认使用后端 KIMI_MODEL" />
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
        <el-table
          :data="[
            ...result.createdItems,
            ...result.failedItems.map((item) => item.record).filter(Boolean)
          ]"
          border
        >
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
          <el-table-column label="错误原因" min-width="220">
            <template #default="{ row }">{{ row?.errorMessage || "无" }}</template>
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

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { ChatDotRound, Refresh, Search } from "@element-plus/icons-vue";
import {
  askAftersalesQuestion,
  getAftersalesQuestionRecord,
  getAftersalesQuestionRecords,
  type AftersalesAnswerStatus,
  type AftersalesCitedSource,
  type AftersalesQuestionRecord,
  type AftersalesQuestionRecordQuery
} from "@/api/aftersales-qa";
import AppErrorState from "@/components/AppErrorState.vue";
import { materialTypeLabelMap } from "@/config/knowledge-options";
import { useAuthStore } from "@/stores/auth";
import { normalizeRole } from "@/utils/permission";
import type { KnowledgeMaterialType } from "@/api/knowledge";

type DateRangeValue = [string, string] | null;

const NO_SOURCE_MESSAGE = "知识库中未找到可靠依据，建议补充资料或转人工确认。";

const answerStatusOptions = [
  { label: "全部状态", value: "" },
  { label: "有依据", value: "answered" },
  { label: "无可靠依据", value: "no_reliable_source" },
  { label: "生成失败", value: "failed" }
];

const evidenceOptions = [
  { label: "全部", value: "all" },
  { label: "有依据", value: "yes" },
  { label: "无依据", value: "no" }
] as const;

const answerStatusLabels: Record<AftersalesAnswerStatus, string> = {
  answered: "有依据",
  no_reliable_source: "无可靠依据",
  failed: "生成失败"
};

const answerStatusTagType: Record<AftersalesAnswerStatus, "success" | "warning" | "danger"> = {
  answered: "success",
  no_reliable_source: "warning",
  failed: "danger"
};

const authStore = useAuthStore();
const question = ref("");
const asking = ref(false);
const loadingRecords = ref(false);
const errorMessage = ref("");
const latestResult = ref<AftersalesQuestionRecord | null>(null);
const records = ref<AftersalesQuestionRecord[]>([]);
const total = ref(0);
const dateRange = ref<DateRangeValue>(null);
const filters = reactive({
  answerStatus: "" as "" | AftersalesAnswerStatus,
  evidence: "all" as "all" | "yes" | "no",
  scope: "mine" as "mine" | "all",
  page: 1,
  pageSize: 20
});

const normalizedRole = computed(() =>
  normalizeRole(authStore.currentRole ?? authStore.currentUser?.role)
);
const isAdmin = computed(() =>
  ["platform_admin", "company_admin"].includes(normalizedRole.value)
);

const canAsk = computed(() => question.value.trim().length >= 2 && !asking.value);

const buildRecordQuery = (): AftersalesQuestionRecordQuery => ({
  answerStatus: filters.answerStatus || undefined,
  hasReliableSource:
    filters.evidence === "all" ? undefined : filters.evidence === "yes",
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1],
  userId:
    isAdmin.value && filters.scope === "mine" ? authStore.currentUser?.id : undefined,
  page: filters.page,
  pageSize: filters.pageSize
});

const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN");
const formatSourceTitle = (source: AftersalesCitedSource) =>
  `${source.knowledgeBaseName} / ${source.fileTitle}`;

const materialTypeLabel = (value: KnowledgeMaterialType) => materialTypeLabelMap[value] ?? value;
const getAnswerStatusLabel = (value: AftersalesAnswerStatus) => answerStatusLabels[value] ?? value;
const getAnswerStatusType = (value: AftersalesAnswerStatus) =>
  answerStatusTagType[value] ?? "info";

const loadRecords = async () => {
  loadingRecords.value = true;
  errorMessage.value = "";

  try {
    const result = await getAftersalesQuestionRecords(buildRecordQuery());
    records.value = result.items;
    total.value = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后问答记录加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loadingRecords.value = false;
  }
};

const handleAsk = async () => {
  const text = question.value.trim();

  if (text.length < 2) {
    ElMessage.warning("请输入售后问题");
    return;
  }

  asking.value = true;

  try {
    const result = await askAftersalesQuestion({ question: text });
    latestResult.value = {
      id: result.recordId,
      companyId: authStore.currentCompany?.id ?? "",
      userId: authStore.currentUser?.id ?? "",
      question: text,
      answer: result.answer,
      answerStatus: result.answerStatus,
      citedSources: result.citedSources,
      usedMaterialTypes: result.usedMaterialTypes,
      isAnswered: result.isAnswered,
      hasReliableSource: result.hasReliableSource,
      isMock: result.isMock,
      aiUsageRecordId: null,
      feedbackStatus: "none",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    question.value = "";
    await loadRecords();
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后问答提交失败";
    ElMessage.error(message);
  } finally {
    asking.value = false;
  }
};

const handleSearch = () => {
  filters.page = 1;
  void loadRecords();
};

const handleRecordDetail = async (record: AftersalesQuestionRecord) => {
  try {
    latestResult.value = await getAftersalesQuestionRecord(record.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后问答详情加载失败";
    ElMessage.error(message);
  }
};

watch(
  () => filters.pageSize,
  () => {
    filters.page = 1;
    void loadRecords();
  }
);

onMounted(() => {
  if (isAdmin.value) {
    filters.scope = "all";
  }
  void loadRecords();
});
</script>

<template>
  <section class="aftersales-qa-page">
    <div class="qa-workspace">
      <section class="ask-panel">
        <div class="panel-heading">
          <div>
            <h3>售后问答</h3>
            <span>基于已审核售后资料和产品资料回答</span>
          </div>
          <el-tag effect="plain" type="info">mock / token 0</el-tag>
        </div>

        <el-input
          v-model="question"
          type="textarea"
          :rows="6"
          maxlength="1000"
          show-word-limit
          placeholder="输入内部售后问题，例如：某型号报错、现场无信号、接线异常等"
          @keydown.meta.enter.prevent="handleAsk"
          @keydown.ctrl.enter.prevent="handleAsk"
        />
        <div class="ask-actions">
          <el-button :icon="ChatDotRound" :loading="asking" type="primary" :disabled="!canAsk" @click="handleAsk">
            提问
          </el-button>
        </div>

        <section class="answer-panel">
          <template v-if="latestResult">
            <div class="answer-heading">
              <div>
                <span>回答</span>
                <strong>{{ latestResult.question }}</strong>
              </div>
              <el-tag :type="getAnswerStatusType(latestResult.answerStatus)" effect="plain">
                {{ getAnswerStatusLabel(latestResult.answerStatus) }}
              </el-tag>
            </div>
            <el-alert
              v-if="!latestResult.hasReliableSource"
              :title="NO_SOURCE_MESSAGE"
              type="warning"
              show-icon
              :closable="false"
            />
            <p class="answer-text">{{ latestResult.answer }}</p>

            <div class="source-section">
              <h4>引用来源</h4>
              <el-empty
                v-if="latestResult.citedSources.length === 0"
                description="暂无引用来源"
                :image-size="80"
              />
              <div v-else class="source-list">
                <article
                  v-for="source in latestResult.citedSources"
                  :key="source.chunkId"
                  class="source-item"
                >
                  <div class="source-item__title">
                    <strong>{{ formatSourceTitle(source) }}</strong>
                    <el-tag size="small" effect="plain">
                      {{ materialTypeLabel(source.materialType) }}
                    </el-tag>
                  </div>
                  <p>{{ source.snippet }}</p>
                  <span>片段 {{ source.chunkId }}</span>
                </article>
              </div>
            </div>
          </template>
          <el-empty v-else description="暂无问答结果" :image-size="88" />
        </section>
      </section>

      <section class="history-panel">
        <div class="history-toolbar">
          <el-form inline>
            <el-form-item label="状态">
              <el-select v-model="filters.answerStatus" class="history-control">
                <el-option
                  v-for="item in answerStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="依据">
              <el-select v-model="filters.evidence" class="evidence-control">
                <el-option
                  v-for="item in evidenceOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item v-if="isAdmin" label="范围">
              <el-segmented
                v-model="filters.scope"
                :options="[
                  { label: '全部', value: 'all' },
                  { label: '我的', value: 'mine' }
                ]"
              />
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
          </el-form>
          <div class="toolbar-actions">
            <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
            <el-button :icon="Refresh" :loading="loadingRecords" @click="loadRecords">刷新</el-button>
          </div>
        </div>

        <AppErrorState v-if="errorMessage" :message="errorMessage" @retry="loadRecords" />

        <template v-else>
          <el-table :data="records" :loading="loadingRecords" border>
            <el-table-column label="时间" min-width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="提问" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.question }}</template>
            </el-table-column>
            <el-table-column label="用户" min-width="130">
              <template #default="{ row }">{{ row.userName ?? row.userId }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getAnswerStatusType(row.answerStatus)" effect="plain">
                  {{ getAnswerStatusLabel(row.answerStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="引用" width="90">
              <template #default="{ row }">{{ row.citedSources.length }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleRecordDetail(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              v-model:current-page="filters.page"
              v-model:page-size="filters.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              :total="total"
              @current-change="loadRecords"
            />
          </div>
        </template>
      </section>
    </div>
  </section>
</template>

<style scoped>
.aftersales-qa-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qa-workspace {
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.08fr);
  gap: 16px;
  align-items: start;
}

.ask-panel,
.history-panel,
.answer-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.ask-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.history-panel {
  padding: 16px;
}

.panel-heading,
.answer-heading,
.source-item__title,
.history-toolbar,
.ask-actions,
.toolbar-actions,
.pagination-row {
  display: flex;
  align-items: center;
}

.panel-heading,
.answer-heading,
.history-toolbar,
.pagination-row {
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h3,
.source-section h4 {
  margin: 0;
}

.panel-heading span,
.answer-heading span,
.source-item span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.answer-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}

.answer-heading {
  align-items: flex-start;
}

.answer-heading div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.answer-heading strong {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.answer-text {
  margin: 0;
  white-space: pre-line;
  line-height: 1.75;
}

.source-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.source-item__title {
  justify-content: space-between;
  gap: 8px;
}

.source-item p {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.history-toolbar {
  align-items: flex-start;
  margin-bottom: 14px;
}

.ask-actions {
  justify-content: flex-end;
}

.toolbar-actions {
  gap: 8px;
}

.history-control {
  width: 150px;
}

.evidence-control {
  width: 120px;
}

.date-control {
  width: 280px;
}

.pagination-row {
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 1180px) {
  .qa-workspace {
    grid-template-columns: 1fr;
  }

  .history-toolbar {
    flex-direction: column;
  }
}
</style>

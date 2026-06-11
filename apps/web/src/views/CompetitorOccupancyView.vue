<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { Refresh } from "@element-plus/icons-vue";
import { getContentItems, type ContentItem } from "@/api/content";
import { getGeoPrompts, type GeoPrompt } from "@/api/geo-prompts";
import {
  getKnowledgeBases,
  getKnowledgeFiles,
  type KnowledgeBase,
  type KnowledgeFile
} from "@/api/knowledge";
import { getModelInclusionRecords, type ModelInclusionRecord } from "@/api/model-inclusion";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import {
  buildCompetitorDistribution,
  buildCompetitorOccupancyReviews,
  buildOccupancyReasonDistribution,
  occupancyReasonDescriptionMap,
  occupancyReasonLabelMap,
  occupancyTypeLabelMap,
  type CompetitorOccupancyReason
} from "@/config/geo-competitor-options";
import {
  buildEvidenceCitationChains,
  mergeKnowledgeFilesWithBase
} from "@/config/evidence-citation-options";

type OccupancyFilterValue =
  | "all"
  | "high_value"
  | "own_missing"
  | "needs_evidence"
  | "comparison"
  | "manual_review";

const prompts = ref<GeoPrompt[]>([]);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const knowledgeFilesByBaseId = ref<Record<string, KnowledgeFile[]>>({});
const contentItems = ref<ContentItem[]>([]);
const modelRecords = ref<ModelInclusionRecord[]>([]);
const loading = ref(false);
const loadError = ref("");
const lastLoadedAt = ref("");
const activeFilter = ref<OccupancyFilterValue>("all");

const occupancyFilters: Array<{ label: string; value: OccupancyFilterValue }> = [
  { label: "全部", value: "all" },
  { label: "高意向", value: "high_value" },
  { label: "我方缺席", value: "own_missing" },
  { label: "需补证据", value: "needs_evidence" },
  { label: "对比 / 替代", value: "comparison" },
  { label: "待确认", value: "manual_review" }
];

const knowledgeFiles = computed(() =>
  mergeKnowledgeFilesWithBase(knowledgeBases.value, knowledgeFilesByBaseId.value)
);

const evidenceChains = computed(() =>
  buildEvidenceCitationChains({
    contentItems: contentItems.value,
    knowledgeFiles: knowledgeFiles.value,
    modelRecords: modelRecords.value,
    prompts: prompts.value
  })
);

const occupancyReviews = computed(() =>
  buildCompetitorOccupancyReviews(modelRecords.value, evidenceChains.value)
);

const filteredReviews = computed(() =>
  occupancyReviews.value.filter((review) => {
    switch (activeFilter.value) {
      case "comparison":
        return review.buyingStage === "对比阶段" || review.reasons.includes("prompt_bias");
      case "high_value":
        return review.businessValue === "高意向";
      case "manual_review":
        return review.reasons.includes("manual_check") || review.occupancyType === "unknown";
      case "needs_evidence":
        return review.reasons.includes("evidence_gap") || review.reasons.includes("spec_gap");
      case "own_missing":
        return review.ownStatus === "缺席";
      case "all":
      default:
        return true;
    }
  })
);

const competitorDistribution = computed(() => buildCompetitorDistribution(occupancyReviews.value));
const reasonDistribution = computed(() => buildOccupancyReasonDistribution(occupancyReviews.value));

const maxCompetitorCount = computed(() =>
  Math.max(...competitorDistribution.value.map((item) => item.count), 1)
);

const maxReasonCount = computed(() => Math.max(...reasonDistribution.value.map((item) => item.count), 1));

// 概览只保留占位、缺席和证据三项，避免复盘页一开始就过载。
const overviewCards = computed(() => [
  {
    label: "竞品占位问题",
    value: occupancyReviews.value.filter((review) => review.competitorBrands.length > 0).length,
    helper: "出现竞品信号"
  },
  {
    label: "我方缺席问题",
    value: occupancyReviews.value.filter((review) => review.ownStatus === "缺席").length,
    helper: "回答未体现我方"
  },
  {
    label: "需补证据问题",
    value: occupancyReviews.value.filter((review) => review.reasons.includes("evidence_gap")).length,
    helper: "补产品、场景、参数"
  }
]);

const isEmpty = computed(() => !loading.value && !loadError.value && occupancyReviews.value.length === 0);

const formatNumber = (value: number) => value.toLocaleString();

const formatDateTime = (value?: string) => {
  if (!value) {
    return "待确认";
  }

  return new Date(value).toLocaleString();
};

const getPriorityTagType = (priority: "高" | "中" | "低") => {
  if (priority === "高") {
    return "danger";
  }
  if (priority === "中") {
    return "warning";
  }

  return "info";
};

const getOwnStatusTagType = (status: string) => {
  if (status === "已推荐") {
    return "success";
  }
  if (status === "仅提及") {
    return "warning";
  }
  if (status === "缺席") {
    return "danger";
  }

  return "info";
};

const getReasonTagType = (reason: CompetitorOccupancyReason) => {
  const dangerReasons: CompetitorOccupancyReason[] = ["evidence_gap", "content_gap", "citation_gap"];
  const warningReasons: CompetitorOccupancyReason[] = ["prompt_bias", "scenario_gap", "spec_gap"];

  if (dangerReasons.includes(reason)) {
    return "danger";
  }
  if (warningReasons.includes(reason)) {
    return "warning";
  }

  return "info";
};

const loadCompetitorOccupancy = async () => {
  loading.value = true;
  loadError.value = "";

  try {
    const [promptResult, baseResult, contentResult, recordResult] = await Promise.all([
      getGeoPrompts({ page: 1, pageSize: 80 }),
      getKnowledgeBases({ page: 1, pageSize: 20 }),
      getContentItems({ page: 1, pageSize: 80 }),
      getModelInclusionRecords({ page: 1, pageSize: 100, voidStatus: "normal" })
    ]);

    prompts.value = promptResult.items;
    knowledgeBases.value = baseResult.items;
    contentItems.value = contentResult.items;
    modelRecords.value = recordResult.items;

    const filesByBaseId: Record<string, KnowledgeFile[]> = {};
    const fileResults = await Promise.all(
      baseResult.items.slice(0, 10).map(async (base) => ({
        id: base.id,
        result: await getKnowledgeFiles(base.id, { page: 1, pageSize: 50 })
      }))
    );

    for (const item of fileResults) {
      filesByBaseId[item.id] = item.result.items;
    }

    knowledgeFilesByBaseId.value = filesByBaseId;
    lastLoadedAt.value = new Date().toLocaleString();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "竞品占位原因加载失败";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadCompetitorOccupancy();
});
</script>

<template>
  <section class="competitor-occupancy-page">
    <header class="competitor-occupancy-hero">
      <div>
        <h1>竞品占位原因</h1>
        <span>先看谁占位、我方缺什么、下一步怎么补。</span>
        <small>本地 smoke 数据 · 前端轻量识别 · 结果需人工确认</small>
      </div>
      <div class="competitor-occupancy-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadCompetitorOccupancy">
          刷新
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="loadError" title="竞品占位原因加载失败" :message="loadError" />

    <section class="competitor-occupancy-overview" aria-label="竞品占位概览">
      <article v-for="card in overviewCards" :key="card.label">
        <span>{{ card.label }}</span>
        <strong>{{ loading ? "--" : formatNumber(card.value) }}</strong>
        <p>{{ card.helper }}</p>
      </article>
    </section>

    <section class="competitor-occupancy-panel-grid">
      <section class="competitor-occupancy-panel">
        <div class="competitor-occupancy-panel__header">
          <div>
            <h2>竞品分布</h2>
            <p>看哪些竞品出现最多，以及我方是否缺席。</p>
          </div>
          <small>轻量识别</small>
        </div>
        <div v-if="competitorDistribution.length" class="competitor-occupancy-bars">
          <div v-for="item in competitorDistribution" :key="item.label">
            <span>{{ item.label }}</span>
            <i>
              <b :style="{ width: `${(item.count / maxCompetitorCount) * 100}%` }" />
            </i>
            <strong>{{ item.count }}</strong>
            <small>高意向 {{ item.highValueCount }} · 我方缺席 {{ item.ownMissingCount }}</small>
          </div>
        </div>
        <AppEmptyState
          v-else
          title="暂无明确竞品信号"
          description="当前 smoke 记录中未识别到稳定竞品词，建议补充高意向对比 / 替代问法后再复盘。"
        />
      </section>

      <section class="competitor-occupancy-panel">
        <div class="competitor-occupancy-panel__header">
          <div>
            <h2>占位原因分布</h2>
            <p>按证据、文章、问法和模型复盘缺口归类。</p>
          </div>
          <small>需确认</small>
        </div>
        <div v-if="reasonDistribution.length" class="competitor-occupancy-bars">
          <div v-for="item in reasonDistribution" :key="item.value">
            <span>{{ item.label }}</span>
            <i>
              <b :style="{ width: `${(item.count / maxReasonCount) * 100}%` }" />
            </i>
            <strong>{{ item.count }}</strong>
            <small>{{ occupancyReasonDescriptionMap[item.value] }}</small>
          </div>
        </div>
        <AppEmptyState
          v-else
          title="暂无原因分布"
          description="当前记录还不足以形成稳定分布，先查看复盘列表中的待确认项。"
        />
      </section>
    </section>

    <section class="competitor-occupancy-review-list" aria-label="竞品占位复盘列表">
      <div class="competitor-occupancy-list-header">
        <div>
          <h2>竞品占位复盘</h2>
          <p>逐条查看问法、竞品信号、我方状态和补救动作。</p>
        </div>
        <div class="competitor-occupancy-filter-row">
          <small>当前展示 {{ filteredReviews.length }} / {{ occupancyReviews.length }} 条</small>
          <el-radio-group v-model="activeFilter" size="small">
            <el-radio-button
              v-for="filter in occupancyFilters"
              :key="filter.value"
              :value="filter.value"
            >
              {{ filter.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-skeleton v-if="loading" animated :rows="8" />

      <AppEmptyState
        v-else-if="isEmpty"
        title="暂无足够模型覆盖记录形成竞品复盘"
        description="建议先添加高意向问法、补知识库证据、生成引用友好文章，再补模型覆盖记录。"
      />

      <div v-else class="competitor-occupancy-card-grid">
        <article
          v-for="review in filteredReviews"
          :key="review.id"
          class="competitor-occupancy-card"
        >
          <div class="competitor-occupancy-card__main">
            <div>
              <p>用户问法</p>
              <h3>{{ review.promptText }}</h3>
            </div>
            <div class="competitor-occupancy-card__tags">
              <el-tag :type="getPriorityTagType(review.priority)" effect="plain">
                {{ review.priority }}优先级
              </el-tag>
              <el-tag type="info" effect="plain">{{ review.questionType }}</el-tag>
              <el-tag type="warning" effect="plain">{{ review.businessValue }}</el-tag>
              <el-tag type="success" effect="plain">{{ review.buyingStage }}</el-tag>
            </div>
          </div>

          <div class="competitor-occupancy-status-row">
            <span>
              模型
              <strong>{{ review.model }}</strong>
            </span>
            <span>
              我方状态
              <el-tag :type="getOwnStatusTagType(review.ownStatus)" effect="plain">
                {{ review.ownStatus }}
              </el-tag>
            </span>
            <span>
              占位类型
              <el-tag type="warning" effect="plain">
                {{ occupancyTypeLabelMap[review.occupancyType] }}
              </el-tag>
            </span>
          </div>

          <div class="competitor-occupancy-detail-grid">
            <section>
              <strong>竞品品牌</strong>
              <div v-if="review.competitorBrands.length" class="competitor-occupancy-tag-row">
                <el-tag
                  v-for="brand in review.competitorBrands"
                  :key="brand.id"
                  type="danger"
                  effect="plain"
                  size="small"
                >
                  {{ brand.label }}
                </el-tag>
              </div>
              <small v-else>暂无明确竞品品牌，需结合原始回答人工确认。</small>
            </section>
            <section>
              <strong>轻量原因</strong>
              <div class="competitor-occupancy-tag-row">
                <el-tooltip
                  v-for="reason in review.reasons"
                  :key="reason"
                  :content="occupancyReasonDescriptionMap[reason]"
                  placement="top"
                >
                  <el-tag :type="getReasonTagType(reason)" effect="plain" size="small">
                    {{ occupancyReasonLabelMap[reason] }}
                  </el-tag>
                </el-tooltip>
              </div>
            </section>
            <section>
              <strong>下一步动作</strong>
              <div class="competitor-occupancy-action-row">
                <RouterLink v-for="action in review.nextActions" :key="action.label" :to="action.to">
                  {{ action.label }}
                </RouterLink>
              </div>
            </section>
          </div>

          <details class="competitor-occupancy-detail-drawer">
            <summary>查看回答摘要、证据链缺口和检测时间</summary>
            <div class="competitor-occupancy-detail-grid">
              <section>
                <strong>证据链缺口</strong>
                <div class="competitor-occupancy-tag-row">
                  <el-tag
                    v-for="gap in review.evidenceGaps"
                    :key="gap"
                    type="info"
                    effect="plain"
                    size="small"
                  >
                    {{ gap }}
                  </el-tag>
                </div>
              </section>
              <section class="competitor-occupancy-summary">
                <strong>回答摘要</strong>
                <p>{{ review.summary }}</p>
                <small>{{ review.sourceNote }}</small>
              </section>
              <section>
                <strong>检测时间</strong>
                <small>{{ formatDateTime(review.checkedAt) }}</small>
              </section>
            </div>
          </details>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.competitor-occupancy-page {
  display: grid;
  gap: 14px;
  color: #172331;
}

.competitor-occupancy-hero,
.competitor-occupancy-panel,
.competitor-occupancy-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.competitor-occupancy-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.competitor-occupancy-card__main p {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.competitor-occupancy-hero h1 {
  margin: 0;
  color: #101828;
  font-size: 21px;
  letter-spacing: 0;
}

.competitor-occupancy-hero span,
.competitor-occupancy-hero small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  line-height: 1.6;
}

.competitor-occupancy-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  min-width: 240px;
}

.competitor-occupancy-hero__actions span {
  width: 100%;
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.competitor-occupancy-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.competitor-occupancy-overview article {
  min-height: 76px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.competitor-occupancy-overview span {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.competitor-occupancy-overview strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 20px;
  letter-spacing: 0;
}

.competitor-occupancy-overview p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.competitor-occupancy-panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.competitor-occupancy-panel,
.competitor-occupancy-card {
  padding: 12px;
}

.competitor-occupancy-panel__header,
.competitor-occupancy-list-header,
.competitor-occupancy-card__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.competitor-occupancy-panel__header h2,
.competitor-occupancy-list-header h2 {
  margin: 0;
  color: #101828;
  font-size: 17px;
  letter-spacing: 0;
}

.competitor-occupancy-panel__header p,
.competitor-occupancy-list-header p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.6;
}

.competitor-occupancy-panel__header small {
  display: inline-flex;
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.competitor-occupancy-bars {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.competitor-occupancy-bars div {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(120px, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: #344054;
  font-size: 13px;
}

.competitor-occupancy-bars i {
  overflow: hidden;
  height: 10px;
  border-radius: 4px;
  background: #edf3f9;
}

.competitor-occupancy-bars b {
  display: block;
  min-width: 4px;
  height: 100%;
  border-radius: inherit;
  background: #0070f3;
}

.competitor-occupancy-bars small {
  grid-column: 1 / -1;
  color: #667085;
  line-height: 1.5;
}

.competitor-occupancy-review-list {
  display: grid;
  gap: 14px;
}

.competitor-occupancy-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.competitor-occupancy-filter-row small {
  color: #64748b;
}

.competitor-occupancy-card-grid {
  display: grid;
  gap: 14px;
}

.competitor-occupancy-card {
  display: grid;
  gap: 12px;
}

.competitor-occupancy-card__main h3 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #111827;
  font-size: 16px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  letter-spacing: 0;
}

.competitor-occupancy-card__tags,
.competitor-occupancy-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.competitor-occupancy-status-row,
.competitor-occupancy-detail-grid {
  display: grid;
  gap: 12px;
}

.competitor-occupancy-status-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.competitor-occupancy-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.competitor-occupancy-status-row span,
.competitor-occupancy-detail-grid section,
.competitor-occupancy-summary {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.competitor-occupancy-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.competitor-occupancy-action-row a {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.competitor-occupancy-detail-drawer {
  border-top: 1px solid #eef2f7;
  padding-top: 8px;
}

.competitor-occupancy-detail-drawer summary {
  width: fit-content;
  cursor: pointer;
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
}

.competitor-occupancy-detail-drawer[open] {
  display: grid;
  gap: 12px;
}

.competitor-occupancy-status-row span {
  color: #64748b;
  font-size: 12px;
}

.competitor-occupancy-status-row strong,
.competitor-occupancy-detail-grid strong,
.competitor-occupancy-summary strong {
  color: #111827;
  font-size: 14px;
}

.competitor-occupancy-detail-grid small,
.competitor-occupancy-summary small {
  color: #667085;
  line-height: 1.5;
}

.competitor-occupancy-summary p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #344054;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.competitor-occupancy-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;
}

.competitor-occupancy-card footer a {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

@media (max-width: 1180px) {
  .competitor-occupancy-overview,
  .competitor-occupancy-panel-grid,
  .competitor-occupancy-status-row,
  .competitor-occupancy-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .competitor-occupancy-hero,
  .competitor-occupancy-panel__header,
  .competitor-occupancy-list-header,
  .competitor-occupancy-card__main {
    display: grid;
  }

  .competitor-occupancy-hero__actions,
  .competitor-occupancy-hero__actions span,
  .competitor-occupancy-filter-row {
    justify-content: flex-start;
    min-width: 0;
    text-align: left;
  }

  .competitor-occupancy-overview,
  .competitor-occupancy-panel-grid,
  .competitor-occupancy-status-row,
  .competitor-occupancy-detail-grid,
  .competitor-occupancy-bars div {
    grid-template-columns: 1fr;
  }
}
</style>

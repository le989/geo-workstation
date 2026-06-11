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
  articleCitationStatusLabelMap,
  buildEvidenceCitationChains,
  buildEvidenceGapDistribution,
  evidenceSupportStatusLabelMap,
  mergeKnowledgeFilesWithBase,
  modelCoverageCitationStatusLabelMap,
  type ArticleCitationStatus,
  type EvidenceSupportStatus,
  type ModelCoverageCitationStatus
} from "@/config/evidence-citation-options";

type CitationFilterValue =
  | "all"
  | "high_value"
  | "missing_evidence"
  | "not_recommended"
  | "purchase_comparison"
  | "manual_review";

const prompts = ref<GeoPrompt[]>([]);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const knowledgeFilesByBaseId = ref<Record<string, KnowledgeFile[]>>({});
const contentItems = ref<ContentItem[]>([]);
const modelRecords = ref<ModelInclusionRecord[]>([]);
const loading = ref(false);
const loadError = ref("");
const lastLoadedAt = ref("");
const activeFilter = ref<CitationFilterValue>("all");

const citationFilters: Array<{ label: string; value: CitationFilterValue }> = [
  { label: "全部", value: "all" },
  { label: "高意向", value: "high_value" },
  { label: "缺证据", value: "missing_evidence" },
  { label: "未推荐", value: "not_recommended" },
  { label: "采购 / 对比", value: "purchase_comparison" },
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

const filteredChains = computed(() =>
  evidenceChains.value.filter((chain) => {
    switch (activeFilter.value) {
      case "high_value":
        return chain.businessValue === "高意向";
      case "manual_review":
        return chain.gaps.includes("需人工确认");
      case "missing_evidence":
        return chain.gaps.includes("缺证据");
      case "not_recommended":
        return chain.gaps.includes("未推荐") || chain.coverageStatus === "not_recommended";
      case "purchase_comparison":
        return chain.buyingStage === "采购阶段" || chain.buyingStage === "对比阶段";
      case "all":
      default:
        return true;
    }
  })
);

// 概览只保留首屏最关键的三项，细节留给列表和展开区。
const overviewCards = computed(() => [
  {
    label: "有证据支撑的问题",
    value: evidenceChains.value.filter((chain) => chain.evidenceStatus === "citable").length,
    helper: "匹配到可引用资料"
  },
  {
    label: "缺证据的问题",
    value: evidenceChains.value.filter((chain) => chain.gaps.includes("缺证据")).length,
    helper: "优先补知识库"
  },
  {
    label: "待人工确认",
    value: evidenceChains.value.filter((chain) => chain.gaps.includes("需人工确认")).length,
    helper: "弱关联需复核"
  }
]);

const gapDistribution = computed(() => buildEvidenceGapDistribution(evidenceChains.value));

const maxGapCount = computed(() => Math.max(...gapDistribution.value.map((item) => item.count), 1));

const isEmpty = computed(() => !loading.value && !loadError.value && evidenceChains.value.length === 0);

const formatNumber = (value: number) => value.toLocaleString();

const formatDateTime = (value?: string) => {
  if (!value) {
    return "待确认";
  }

  return new Date(value).toLocaleString();
};

const getEvidenceStatusTagType = (status: EvidenceSupportStatus) => {
  const typeMap: Record<EvidenceSupportStatus, "success" | "warning" | "info" | "danger"> = {
    citable: "success",
    manual_review: "info",
    needs_evidence: "danger",
    needs_label: "warning"
  };

  return typeMap[status];
};

const getArticleStatusTagType = (status: ArticleCitationStatus) => {
  const typeMap: Record<ArticleCitationStatus, "success" | "warning" | "info" | "danger"> = {
    friendly: "success",
    manual_review: "info",
    missing: "danger",
    needs_review: "warning"
  };

  return typeMap[status];
};

const getCoverageStatusTagType = (status: ModelCoverageCitationStatus) => {
  const typeMap: Record<ModelCoverageCitationStatus, "success" | "warning" | "info" | "danger"> = {
    mentioned: "warning",
    missing: "info",
    not_recommended: "danger",
    recommended: "success"
  };

  return typeMap[status];
};

const loadEvidenceCitationCenter = async () => {
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
    loadError.value = error instanceof Error ? error.message : "引用证据中心加载失败";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadEvidenceCitationCenter();
});
</script>

<template>
  <section class="evidence-citation-page review-page">
    <header class="evidence-citation-hero review-page__header">
      <div>
        <h1>引用证据中心</h1>
        <span>先看问题是否缺证据、缺文章或缺模型覆盖。</span>
        <small>本地 smoke 数据 · 只读聚合 · 待人工确认</small>
      </div>
      <div class="evidence-citation-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadEvidenceCitationCenter">
          刷新
        </el-button>
      </div>
    </header>

    <AppErrorState v-if="loadError" title="引用证据中心加载失败" :message="loadError" />

    <section class="evidence-citation-overview review-page__summary" aria-label="引用证据概览">
      <article v-for="card in overviewCards" :key="card.label">
        <span>{{ card.label }}</span>
        <strong>{{ loading ? "--" : formatNumber(card.value) }}</strong>
        <p>{{ card.helper }}</p>
      </article>
    </section>

    <section class="evidence-citation-workbench review-page__details">
      <section class="evidence-citation-panel evidence-citation-gap-panel">
        <div class="evidence-citation-panel__header">
          <div>
            <h2>证据缺口分布</h2>
            <p>紧凑查看缺证据、缺文章和待确认项。</p>
          </div>
        </div>
        <div class="evidence-citation-gap-bars">
          <div v-for="item in gapDistribution" :key="item.label">
            <span>{{ item.label }}</span>
            <i>
              <b :style="{ width: `${(item.count / maxGapCount) * 100}%` }" />
            </i>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>

      <section class="evidence-citation-chain-list" aria-label="问题证据链列表">
        <div class="evidence-citation-list-header">
          <div>
            <h2>问题证据链</h2>
            <p>默认优先看状态、缺口和下一步，关联证据放入展开区。</p>
          </div>
          <div class="evidence-citation-list-tools">
            <small>当前展示 {{ filteredChains.length }} / {{ evidenceChains.length }} 条</small>
            <el-radio-group v-model="activeFilter" size="small">
              <el-radio-button
                v-for="filter in citationFilters"
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
          title="暂无足够记录形成证据链"
          description="建议先添加真实问法，上传产品 / 场景 / 参数资料，生成发布文章后再补模型覆盖记录。"
        />

        <div v-else class="evidence-citation-chain-grid">
          <article
            v-for="chain in filteredChains"
            :key="chain.id"
            class="evidence-citation-chain-card"
          >
            <div class="evidence-citation-chain-card__main">
              <div>
                <p>用户问法</p>
                <h3>{{ chain.promptText }}</h3>
              </div>
              <div class="evidence-citation-chain-card__status">
                <el-tag type="info" effect="plain">{{ chain.questionType }}</el-tag>
                <el-tag type="warning" effect="plain">{{ chain.businessValue }}</el-tag>
                <el-tag type="success" effect="plain">{{ chain.buyingStage }}</el-tag>
              </div>
            </div>

            <div class="evidence-citation-status-row">
              <span>
                证据状态
                <el-tag :type="getEvidenceStatusTagType(chain.evidenceStatus)" effect="plain">
                  {{ evidenceSupportStatusLabelMap[chain.evidenceStatus] }}
                </el-tag>
              </span>
              <span>
                文章状态
                <el-tag :type="getArticleStatusTagType(chain.articleStatus)" effect="plain">
                  {{ articleCitationStatusLabelMap[chain.articleStatus] }}
                </el-tag>
              </span>
              <span>
                模型覆盖
                <el-tag :type="getCoverageStatusTagType(chain.coverageStatus)" effect="plain">
                  {{ modelCoverageCitationStatusLabelMap[chain.coverageStatus] }}
                </el-tag>
              </span>
            </div>

            <div class="evidence-citation-source-grid">
              <section>
                <strong>主要缺口</strong>
                <div class="evidence-citation-tag-row">
                  <el-tag
                    v-for="gap in chain.gaps"
                    :key="gap"
                    type="warning"
                    effect="plain"
                    size="small"
                  >
                    {{ gap }}
                  </el-tag>
                </div>
              </section>
              <section>
                <strong>下一步建议</strong>
                <div class="evidence-citation-action-row">
                  <RouterLink v-for="action in chain.nextActions" :key="action.label" :to="action.to">
                    {{ action.label }}
                  </RouterLink>
                </div>
              </section>
            </div>

            <details class="evidence-citation-detail-drawer">
              <summary>查看关联证据、文章和匹配说明</summary>
              <div class="evidence-citation-evidence-grid">
                <section>
                  <strong>相关知识库证据</strong>
                  <div v-if="chain.knowledgeMatches.length" class="evidence-citation-match-list">
                    <p v-for="match in chain.knowledgeMatches" :key="match.id">
                      <span>{{ match.title }}</span>
                      <small>{{ match.evidenceType }} · {{ match.citationStatus }}</small>
                    </p>
                  </div>
                  <small v-else>暂无弱关联资料，建议补产品参数、场景、案例或选型证据。</small>
                </section>
                <section>
                  <strong>相关发布文章</strong>
                  <div v-if="chain.articleMatches.length" class="evidence-citation-match-list">
                    <p v-for="match in chain.articleMatches" :key="match.id">
                      <span>{{ match.title }}</span>
                      <small>{{ match.hasEvidence ? "含资料依据" : "资料依据待确认" }}</small>
                    </p>
                  </div>
                  <small v-else>暂无相关文章，建议去发布文章工作台补引用友好内容。</small>
                </section>
                <section>
                  <strong>模型覆盖记录</strong>
                  <div v-if="chain.modelMatches.length" class="evidence-citation-match-list">
                    <p v-for="match in chain.modelMatches" :key="match.id">
                      <span>{{ match.model }}</span>
                      <small>{{ formatDateTime(match.checkedAt) }} · {{ match.brandRecommended ? "已推荐" : "未推荐 / 待确认" }}</small>
                    </p>
                  </div>
                  <small v-else>暂无覆盖记录，建议补人工记录或后续复测。</small>
                </section>
              </div>
              <footer>
                <span>匹配关键词：{{ chain.matchedKeywords.length ? chain.matchedKeywords.join("、") : "暂无明显关键词" }}</span>
                <span>可能来源：{{ chain.possibleSources.join(" / ") }}，需人工确认</span>
                <small>{{ chain.relationNote }}</small>
              </footer>
            </details>
          </article>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.evidence-citation-page {
  display: grid;
  gap: 10px;
  max-width: 1440px;
  margin: 0 auto;
  color: #172331;
}

.evidence-citation-hero,
.evidence-citation-panel,
.evidence-citation-chain-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.evidence-citation-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0 12px;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  background: transparent;
}

.evidence-citation-chain-card__main p {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.evidence-citation-hero h1 {
  margin: 0;
  color: #101828;
  font-size: 22px;
  letter-spacing: 0;
}

.evidence-citation-hero span,
.evidence-citation-hero small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.evidence-citation-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  min-width: 240px;
}

.evidence-citation-hero__actions span {
  width: 100%;
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.evidence-citation-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.evidence-citation-overview article {
  min-height: 62px;
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.evidence-citation-overview span {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.evidence-citation-overview strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 20px;
  letter-spacing: 0;
}

.evidence-citation-overview p {
  margin: 3px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.35;
}

.evidence-citation-panel {
  padding: 10px;
}

.evidence-citation-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.55fr);
  gap: 10px;
  align-items: start;
}

.evidence-citation-gap-panel {
  grid-column: 2;
  grid-row: 1;
}

.evidence-citation-chain-list {
  display: grid;
  grid-column: 1;
  grid-row: 1;
  gap: 10px;
}

.evidence-citation-panel__header,
.evidence-citation-list-header,
.evidence-citation-chain-card__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.evidence-citation-panel__header h2,
.evidence-citation-list-header h2 {
  margin: 0;
  color: #101828;
  font-size: 16px;
  letter-spacing: 0;
}

.evidence-citation-panel__header p,
.evidence-citation-list-header p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.evidence-citation-list-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.evidence-citation-list-tools small {
  color: #64748b;
  font-size: 12px;
}

.evidence-citation-gap-bars {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.evidence-citation-gap-bars div {
  display: grid;
  grid-template-columns: minmax(82px, 0.8fr) minmax(0, 1fr) 30px;
  align-items: center;
  gap: 8px;
  color: #475467;
  font-size: 12px;
}

.evidence-citation-gap-bars i {
  overflow: hidden;
  height: 9px;
  border-radius: 4px;
  background: #eef3f8;
}

.evidence-citation-gap-bars b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.evidence-citation-chain-grid {
  display: grid;
  gap: 8px;
}

.evidence-citation-chain-card {
  display: grid;
  gap: 10px;
  padding: 10px;
}

.evidence-citation-chain-card h3 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #101828;
  font-size: 15px;
  letter-spacing: 0;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.evidence-citation-chain-card__status,
.evidence-citation-tag-row,
.evidence-citation-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.evidence-citation-status-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.evidence-citation-status-row > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  color: #475467;
  font-size: 13px;
}

.evidence-citation-source-grid,
.evidence-citation-evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.evidence-citation-source-grid section,
.evidence-citation-evidence-grid section {
  min-height: 72px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.evidence-citation-detail-drawer {
  border-top: 1px solid #eef2f7;
  padding-top: 8px;
}

.evidence-citation-detail-drawer summary {
  width: fit-content;
  cursor: pointer;
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
}

.evidence-citation-detail-drawer[open] {
  display: grid;
  gap: 12px;
}

.evidence-citation-source-grid strong,
.evidence-citation-evidence-grid strong {
  display: block;
  margin-bottom: 8px;
  color: #1d2939;
  font-size: 13px;
}

.evidence-citation-source-grid p,
.evidence-citation-source-grid small,
.evidence-citation-evidence-grid small,
.evidence-citation-chain-card footer {
  color: #667085;
  line-height: 1.5;
}

.evidence-citation-action-row a {
  padding: 5px 8px;
  border: 1px solid #dbeafe;
  border-radius: 4px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.evidence-citation-match-list {
  display: grid;
  gap: 8px;
}

.evidence-citation-match-list p {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
}

.evidence-citation-match-list p:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.evidence-citation-match-list span,
.evidence-citation-match-list small {
  display: block;
}

.evidence-citation-match-list span {
  color: #344054;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.evidence-citation-match-list small {
  margin-top: 4px;
  color: #667085;
}

.evidence-citation-chain-card footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
  font-size: 12px;
}

@media (max-width: 1180px) {
  .evidence-citation-workbench {
    grid-template-columns: 1fr;
  }

  .evidence-citation-gap-panel,
  .evidence-citation-chain-list {
    grid-column: 1;
    grid-row: auto;
  }

  .evidence-citation-chain-list {
    order: 1;
  }

  .evidence-citation-gap-panel {
    order: 2;
  }

  .evidence-citation-overview,
  .evidence-citation-status-row,
  .evidence-citation-evidence-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .evidence-citation-hero,
  .evidence-citation-panel__header,
  .evidence-citation-list-header,
  .evidence-citation-chain-card__main,
  .evidence-citation-list-tools {
    flex-direction: column;
    align-items: flex-start;
  }

  .evidence-citation-hero__actions,
  .evidence-citation-hero__actions span {
    justify-content: flex-start;
    min-width: 0;
    text-align: left;
  }

  .evidence-citation-overview,
  .evidence-citation-status-row,
  .evidence-citation-source-grid,
  .evidence-citation-evidence-grid {
    grid-template-columns: 1fr;
  }

  .evidence-citation-gap-bars div {
    grid-template-columns: 82px minmax(0, 1fr) 34px;
  }
}
</style>

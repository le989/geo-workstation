<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { CollectionTag, Refresh } from "@element-plus/icons-vue";
import {
  aiGenerateExpansion,
  getExpansionJob,
  ruleGenerateExpansion,
  saveExpansionCandidates,
  type AiGenerateExpansionPayload,
  type ExpansionJobDetail,
  type ExpansionMode,
  type RuleGenerateExpansionPayload,
  type SaveExpansionCandidatesResult
} from "@/api/expansion";
import AiExpansionForm from "@/components/AiExpansionForm.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import ExpansionCandidateTable from "@/components/ExpansionCandidateTable.vue";
import ExpansionJobLookup from "@/components/ExpansionJobLookup.vue";
import ExpansionModeTabs from "@/components/ExpansionModeTabs.vue";
import RuleExpansionForm from "@/components/RuleExpansionForm.vue";
import SaveCandidatesResult from "@/components/SaveCandidatesResult.vue";
import { expansionModeLabelMap, expansionStatusLabelMap } from "@/config/expansion-options";
import { formatDateTime, formatOptional, geoPromptTypeLabelMap } from "@/config/geo-prompt-options";
import { formatAiProvider } from "@/config/label-maps";

const router = useRouter();

const activeMode = ref<ExpansionMode>("rule");
const jobDetail = ref<ExpansionJobDetail | null>(null);
const selectedCandidateIds = ref<string[]>([]);
const generationLoading = ref(false);
const lookupLoading = ref(false);
const saveLoading = ref(false);
const generationError = ref("");
const lookupError = ref("");
const saveError = ref("");
const saveResult = ref<SaveExpansionCandidatesResult | null>(null);
const lastLoadedAt = ref("");

const saveDefaults = reactive({
  createdBy: "",
  defaultPriority: 3,
  defaultProductLine: "",
  defaultTrackEnabled: false
});

const candidates = computed(() => jobDetail.value?.candidates ?? []);
const currentJob = computed(() => jobDetail.value?.job ?? null);
const hasJob = computed(() => Boolean(jobDetail.value));
const selectedCount = computed(() => selectedCandidateIds.value.length);
const nonDuplicateCount = computed(
  () =>
    candidates.value.filter(
      (item) =>
        !item.duplicateInBatch && !item.duplicateInDatabase && !item.selected && !item.savedPromptId
    ).length
);

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

const setJobDetail = (detail: ExpansionJobDetail) => {
  jobDetail.value = detail;
  selectedCandidateIds.value = [];
  lastLoadedAt.value = new Date().toLocaleString();
};

const handleRuleGenerate = async (payload: RuleGenerateExpansionPayload) => {
  generationLoading.value = true;
  generationError.value = "";
  saveError.value = "";
  saveResult.value = null;

  try {
    const result = await ruleGenerateExpansion(payload);
    setJobDetail(result);
    ElMessage.success(`已生成 ${result.candidates.length} 条手动组合候选词。`);
  } catch (error) {
    generationError.value = getErrorMessage(error);
  } finally {
    generationLoading.value = false;
  }
};

const handleAiGenerate = async (payload: AiGenerateExpansionPayload) => {
  generationLoading.value = true;
  generationError.value = "";
  saveError.value = "";
  saveResult.value = null;

  try {
    const result = await aiGenerateExpansion(payload);
    setJobDetail(result);
    ElMessage.success(`AI 已生成 ${result.candidates.length} 条候选词。`);
  } catch (error) {
    generationError.value = getErrorMessage(error);
  } finally {
    generationLoading.value = false;
  }
};

const handleLookupJob = async (
  jobId: string,
  options: { clearSaveResult?: boolean; syncMode?: boolean } = {}
) => {
  lookupLoading.value = true;
  lookupError.value = "";
  if (options.clearSaveResult !== false) {
    saveResult.value = null;
  }

  try {
    const result = await getExpansionJob(jobId);
    setJobDetail(result);
    if (options.syncMode !== false) {
      activeMode.value = result.job.mode;
    }
    ElMessage.success("拓词任务详情已加载。");
  } catch (error) {
    lookupError.value = getErrorMessage(error);
  } finally {
    lookupLoading.value = false;
  }
};

const refreshCurrentJob = async () => {
  if (!currentJob.value) {
    return;
  }

  await handleLookupJob(currentJob.value.id, {
    clearSaveResult: false,
    syncMode: false
  });
};

const handleSaveCandidates = async () => {
  if (!currentJob.value) {
    ElMessage.warning("请先生成或查询一个拓词任务。");
    return;
  }

  if (selectedCandidateIds.value.length === 0) {
    ElMessage.warning("请先勾选非重复候选词。");
    return;
  }

  saveLoading.value = true;
  saveError.value = "";

  try {
    const result = await saveExpansionCandidates(currentJob.value.id, {
      candidateIds: selectedCandidateIds.value,
      createdBy: trimOptional(saveDefaults.createdBy),
      defaultPriority: saveDefaults.defaultPriority,
      defaultProductLine: trimOptional(saveDefaults.defaultProductLine),
      defaultTrackEnabled: saveDefaults.defaultTrackEnabled
    });
    saveResult.value = result;
    selectedCandidateIds.value = [];
    await refreshCurrentJob();
    ElMessage.success(`已保存 ${result.savedCount} 条候选词到提示词策略库。`);
  } catch (error) {
    saveError.value = getErrorMessage(error);
  } finally {
    saveLoading.value = false;
  }
};

const goGeoPrompts = () => {
  void router.push("/geo-prompts");
};
</script>

<template>
  <section class="expansion-page">
    <header class="expansion-hero">
      <div>
        <el-tag type="warning" effect="plain">GEO 拓词</el-tag>
        <h1>AI 拓词</h1>
        <p>
          通过手动组合规则、模拟生成或真实 AI 接口，生成用户可能会向 AI
          提出的问题候选，人工筛选后保存到提示词策略库。
        </p>
        <strong>
          候选词不会自动入库；保存前会检查重复，结果服务于后续内容生成、模型覆盖追踪和 GEO
          优化闭环。
        </strong>
      </div>
      <div class="expansion-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="CollectionTag" type="primary" @click="goGeoPrompts">
          查看提示词策略库
        </el-button>
      </div>
    </header>

    <ExpansionModeTabs v-model="activeMode" />

    <AppErrorState v-if="generationError" title="拓词生成失败" :message="generationError" />

    <RuleExpansionForm
      v-if="activeMode === 'rule'"
      :loading="generationLoading"
      @submit="handleRuleGenerate"
    />
    <AiExpansionForm v-else :loading="generationLoading" @submit="handleAiGenerate" />

    <section class="expansion-result-panel">
      <div class="expansion-result-header">
        <div>
          <p class="section-kicker">拓词任务</p>
          <h2>拓词任务结果</h2>
          <p>查看任务状态、候选词重复标记和保存状态。候选词必须勾选后才会进入策略库。</p>
        </div>
        <el-button
          :icon="Refresh"
          :disabled="!currentJob"
          :loading="lookupLoading"
          @click="refreshCurrentJob"
        >
          刷新当前任务
        </el-button>
      </div>

      <el-empty
        v-if="!hasJob"
        description="暂无拓词候选，请先使用手动组合或 AI 模式生成。"
        class="app-empty-state"
      >
        <template #image>
          <div class="empty-mark">GEO</div>
        </template>
      </el-empty>

      <template v-else-if="currentJob">
        <el-descriptions :column="4" border class="expansion-job-summary">
          <el-descriptions-item label="任务 ID">{{ currentJob.id }}</el-descriptions-item>
          <el-descriptions-item label="拓词方式">
            {{ expansionModeLabelMap[currentJob.mode] }}
          </el-descriptions-item>
          <el-descriptions-item label="任务状态">
            {{ expansionStatusLabelMap[currentJob.status] ?? currentJob.status }}
          </el-descriptions-item>
          <el-descriptions-item label="输出词类型">
            {{ geoPromptTypeLabelMap[currentJob.promptType] ?? currentJob.promptType }}
          </el-descriptions-item>
          <el-descriptions-item label="AI 生成方式">
            {{ formatAiProvider(currentJob.provider) }}
          </el-descriptions-item>
          <el-descriptions-item label="模型名称">
            {{ formatOptional(currentJob.model) }}
          </el-descriptions-item>
          <el-descriptions-item label="训练词">
            {{ formatOptional(currentJob.baseWord) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(currentJob.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <ExpansionCandidateTable
          v-model="selectedCandidateIds"
          :candidates="candidates"
          :loading="generationLoading || lookupLoading"
        />

        <section class="save-candidates-panel">
          <div class="save-candidates-panel__header">
            <div>
              <p class="section-kicker">保存候选词</p>
              <h2>保存选中候选词到提示词策略库</h2>
              <p>
                当前已勾选 {{ selectedCount }} 条，可保存候选
                {{ nonDuplicateCount }} 条。保存前后端会再次检查库内重复。
              </p>
            </div>
            <el-button type="primary" :loading="saveLoading" @click="handleSaveCandidates">
              保存选中候选词到提示词策略库
            </el-button>
          </div>

          <el-alert
            v-if="selectedCount === 0"
            title="未勾选候选词时不会提交保存。可先点击“一键勾选非重复项”，再按需调整。"
            type="info"
            :closable="false"
            show-icon
          />
          <AppErrorState v-if="saveError" title="候选词保存失败" :message="saveError" />

          <el-form label-position="top" class="save-candidates-form">
            <el-form-item label="创建人">
              <el-input
                v-model="saveDefaults.createdBy"
                placeholder="可选，默认由后端使用系统 GEO 运营用户"
              />
            </el-form-item>
            <el-form-item label="默认产品线">
              <el-input
                v-model="saveDefaults.defaultProductLine"
                placeholder="可选，覆盖保存时的产品线"
              />
            </el-form-item>
            <el-form-item label="默认优先级">
              <el-input-number v-model="saveDefaults.defaultPriority" :min="1" :max="5" />
            </el-form-item>
            <el-form-item label="默认追踪状态">
              <el-switch
                v-model="saveDefaults.defaultTrackEnabled"
                active-text="追踪"
                inactive-text="不追踪"
              />
            </el-form-item>
          </el-form>

          <SaveCandidatesResult :result="saveResult" />

          <div v-if="saveResult && saveResult.savedCount > 0" class="expansion-next-actions">
            <el-button type="success" @click="goGeoPrompts">
              前往 /geo-prompts 查看保存结果
            </el-button>
          </div>
        </section>
      </template>
    </section>

    <AppErrorState v-if="lookupError" title="拓词任务查询失败" :message="lookupError" />
    <ExpansionJobLookup :loading="lookupLoading" @lookup="handleLookupJob" />
  </section>
</template>

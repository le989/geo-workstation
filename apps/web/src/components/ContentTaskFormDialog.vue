<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import type { CreateContentTaskPayload } from "@/api/content";
import {
  getKnowledgeBases,
  getKnowledgeFiles,
  type KnowledgeBase,
  type KnowledgeFile
} from "@/api/knowledge";
import { appEnvironment } from "@/config/app-env";
import { useAuthStore } from "@/stores/auth";

type AssistantArticleFormState = {
  articleTopic: string;
  selectedKnowledgeFileIds: string[];
};

type RecommendedKnowledgeFile = KnowledgeFile & {
  knowledgeBaseName: string;
  productLine?: string;
};

const props = defineProps<{
  modelValue: boolean;
  submitting?: boolean;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [payload: CreateContentTaskPayload];
}>();

const defaultProvider = () => (appEnvironment.mockEnabled ? "mock" : "openai_compatible");
const defaultModel = (provider = defaultProvider()) =>
  provider === "mock" ? "mock-content-v1" : "deepseek-chat";
const authStore = useAuthStore();

const form = reactive<AssistantArticleFormState>({
  articleTopic: "",
  selectedKnowledgeFileIds: []
});
const formError = ref("");
const selectError = ref("");
const materialSearch = ref("");
const loadingMaterials = ref(false);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const recommendedKnowledgeFiles = ref<RecommendedKnowledgeFile[]>([]);

const currentCompanyName = computed(() => authStore.currentCompany?.name ?? "当前公司");
const selectedKnowledgeFiles = computed(() =>
  recommendedKnowledgeFiles.value.filter((file) => form.selectedKnowledgeFileIds.includes(file.id))
);
const selectedKnowledgeBaseId = computed(() => selectedKnowledgeFiles.value[0]?.knowledgeBaseId);
const selectedProductLine = computed(
  () => selectedKnowledgeFiles.value.find((file) => file.productLine)?.productLine
);
const selectedSameKnowledgeBase = computed(() => {
  const baseId = selectedKnowledgeBaseId.value;

  return Boolean(
    baseId && selectedKnowledgeFiles.value.every((file) => file.knowledgeBaseId === baseId)
  );
});

const resetForm = () => {
  form.articleTopic = "";
  form.selectedKnowledgeFileIds = [];
  formError.value = "";
  selectError.value = "";
  materialSearch.value = "";
  knowledgeBases.value = [];
  recommendedKnowledgeFiles.value = [];
};

const close = () => {
  emit("update:modelValue", false);
};

const trimOptional = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const loadMaterialOptions = async (search = "") => {
  loadingMaterials.value = true;
  selectError.value = "";

  try {
    const knowledgeResult = await getKnowledgeBases({ page: 1, pageSize: 20, status: "active" });
    knowledgeBases.value = knowledgeResult.items;
    const fileResults = await Promise.all(
      knowledgeResult.items.map(async (base) => {
        const result = await getKnowledgeFiles(base.id, {
          applicableModule: "geo-content",
          officialCitationStatus: "citable",
          page: 1,
          pageSize: 8,
          limit: 8,
          search: trimOptional(search)
        });

        return result.items.map<RecommendedKnowledgeFile>((file) => ({
          ...file,
          knowledgeBaseName: base.name,
          productLine: base.productLine
        }));
      })
    );

    recommendedKnowledgeFiles.value = fileResults
      .flat()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 24);
    form.selectedKnowledgeFileIds = form.selectedKnowledgeFileIds.filter((id) =>
      recommendedKnowledgeFiles.value.some((file) => file.id === id)
    );
  } catch (error) {
    selectError.value =
      error instanceof Error
        ? `${error.message}。请确认后端服务已启动。`
        : "可引用资料加载失败，请稍后重试。";
    recommendedKnowledgeFiles.value = [];
  } finally {
    loadingMaterials.value = false;
  }
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm();
      void loadMaterialOptions();
    }
  }
);

const toggleKnowledgeFile = (file: RecommendedKnowledgeFile) => {
  const selectedSet = new Set(form.selectedKnowledgeFileIds);

  if (selectedSet.has(file.id)) {
    selectedSet.delete(file.id);
    form.selectedKnowledgeFileIds = [...selectedSet];
    return;
  }

  if (selectedKnowledgeBaseId.value && selectedKnowledgeBaseId.value !== file.knowledgeBaseId) {
    formError.value = "一次文章只能选择同一个知识库里的资料，请先取消已选资料。";
    return;
  }

  if (selectedSet.size >= 10) {
    formError.value = "一次最多选择 10 份资料。";
    return;
  }

  selectedSet.add(file.id);
  form.selectedKnowledgeFileIds = [...selectedSet];
  formError.value = "";
};

const confirmRealAiProvider = async () => {
  if (defaultProvider() !== "openai_compatible") {
    return true;
  }

  try {
    await ElMessageBox.confirm(
      "本次重新生成会消耗 AI token / 额度，并会把已选资料发送给模型。确认后才继续。",
      "确认生成文章",
      {
        cancelButtonText: "取消",
        confirmButtonText: "确认生成",
        type: "warning"
      }
    );
    return true;
  } catch {
    return false;
  }
};

const handleSearchMaterials = () => {
  void loadMaterialOptions(materialSearch.value);
};

const handleSubmit = async () => {
  formError.value = "";

  if (!form.articleTopic.trim()) {
    formError.value = "文章主题不能为空。";
    return;
  }

  if (form.selectedKnowledgeFileIds.length === 0) {
    formError.value = "请至少选择 1 份资料。";
    return;
  }

  if (!selectedSameKnowledgeBase.value || !selectedKnowledgeBaseId.value) {
    formError.value = "一次文章只能选择同一个知识库里的资料。";
    return;
  }

  if (!(await confirmRealAiProvider())) {
    return;
  }

  const provider = defaultProvider();

  emit("submit", {
    generationType: "article",
    geoPromptIds: [],
    knowledgeBaseId: selectedKnowledgeBaseId.value,
    model: defaultModel(provider),
    name: form.articleTopic.trim(),
    productLine: selectedProductLine.value,
    provider,
    scopeType: "selected_files",
    selectedKnowledgeFileIds: [...form.selectedKnowledgeFileIds]
  });
};
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="新建发布文章"
    width="760px"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-alert
      title="只填写文章主题并选择资料，系统会按已审核、可引用资料生成文章。"
      type="info"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="formError || errorMessage || selectError"
      :title="formError || errorMessage || selectError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="assistant-article-form" label-position="top">
      <el-form-item label="文章主题" required>
        <el-input
          v-model="form.articleTopic"
          maxlength="80"
          show-word-limit
          placeholder="例如：激光测距传感器在行车防撞中的选型方法"
        />
      </el-form-item>

      <el-form-item label="选择资料" required>
        <div class="assistant-material-picker">
          <div class="assistant-material-picker__search">
            <el-input
              v-model="materialSearch"
              clearable
              :prefix-icon="Search"
              placeholder="搜索资料名称、产品线或主题"
              @keyup.enter="handleSearchMaterials"
            />
            <el-button :loading="loadingMaterials" @click="handleSearchMaterials">搜索</el-button>
          </div>

          <div class="assistant-material-picker__header">
            <div>
              <strong>推荐资料卡片</strong>
              <span>最近可引用资料优先展示，仅限 {{ currentCompanyName }} 已审核资料。</span>
            </div>
            <el-tag effect="plain">已选 {{ form.selectedKnowledgeFileIds.length }} 份</el-tag>
          </div>

          <div v-loading="loadingMaterials" class="assistant-material-grid">
            <button
              v-for="file in recommendedKnowledgeFiles"
              :key="file.id"
              class="assistant-material-card"
              :class="{ 'is-selected': form.selectedKnowledgeFileIds.includes(file.id) }"
              type="button"
              @click="toggleKnowledgeFile(file)"
            >
              <strong>{{ file.title || file.fileName }}</strong>
              <span>{{ file.productLine || file.knowledgeBaseName }}</span>
              <small>{{ file.materialTopic || "可生成文章" }}</small>
              <em>可生成文章</em>
            </button>
          </div>
          <el-empty
            v-if="!loadingMaterials && recommendedKnowledgeFiles.length === 0"
            description="暂无可引用资料，请先让负责人审核知识库资料。"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        生成文章
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.assistant-article-form {
  display: grid;
  gap: 18px;
}

.assistant-material-picker {
  width: 100%;
}

.assistant-material-picker__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.assistant-material-picker__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0 10px;
}

.assistant-material-picker__header div {
  display: grid;
  gap: 3px;
}

.assistant-material-picker__header span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.assistant-material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 10px;
  min-height: 120px;
}

.assistant-material-card {
  display: grid;
  gap: 6px;
  min-height: 116px;
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.assistant-material-card.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.assistant-material-card strong,
.assistant-material-card span,
.assistant-material-card small {
  overflow-wrap: anywhere;
}

.assistant-material-card span,
.assistant-material-card small {
  color: var(--el-text-color-secondary);
}

.assistant-material-card em {
  align-self: end;
  color: var(--el-color-success);
  font-style: normal;
  font-size: 12px;
}
</style>

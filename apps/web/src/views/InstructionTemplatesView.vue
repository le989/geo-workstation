<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import {
  createInstructionTemplate,
  deleteInstructionTemplate,
  duplicateInstructionTemplate,
  getInstructionTemplate,
  getInstructionTemplates,
  updateInstructionTemplate,
  type CreateInstructionTemplatePayload,
  type DuplicateInstructionTemplatePayload,
  type InstructionTemplate,
  type InstructionTemplateQuery,
  type UpdateInstructionTemplatePayload
} from "@/api/instructions";
import AppErrorState from "@/components/AppErrorState.vue";
import InstructionTemplateDetailDrawer from "@/components/InstructionTemplateDetailDrawer.vue";
import InstructionTemplateDuplicateDialog from "@/components/InstructionTemplateDuplicateDialog.vue";
import InstructionTemplateFilters from "@/components/InstructionTemplateFilters.vue";
import InstructionTemplateFormDialog from "@/components/InstructionTemplateFormDialog.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  contentTypeLabelMap,
  formatInstructionModelName,
  instructionTypeLabelMap,
  targetPromptTypeLabelMap
} from "@/config/instruction-options";
import { useAuthStore } from "@/stores/auth";
import { canUseAction } from "@/utils/permission";

const authStore = useAuthStore();
const templates = ref<InstructionTemplate[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const tableError = ref("");
const lastLoadedAt = ref("");

const filters = reactive<InstructionTemplateQuery>({
  page: 1,
  pageSize: 20
});

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingTemplate = ref<InstructionTemplate | null>(null);
const formSubmitting = ref(false);
const formError = ref("");

const detailVisible = ref(false);
const detailLoading = ref(false);
const detailTemplate = ref<InstructionTemplate | null>(null);

const duplicateVisible = ref(false);
const duplicatingTemplate = ref<InstructionTemplate | null>(null);
const duplicateSubmitting = ref(false);
const duplicateError = ref("");

const hasTableError = computed(() => Boolean(tableError.value));
const isEmpty = computed(() => !loading.value && templates.value.length === 0);
const instructionAssetMetrics = computed(() => {
  const brandAnchorCount = templates.value.filter(hasBrandAnchor).length;
  const factBoundaryCount = templates.value.filter(hasFactBoundary).length;
  const modelScopedCount = templates.value.filter((template) => template.targetModel?.trim()).length;

  return [
    {
      label: "指令模板",
      value: total.value,
      note: "当前筛选结果"
    },
    {
      label: "品牌锚点",
      value: brandAnchorCount,
      note: "当前页已标明"
    },
    {
      label: "事实边界",
      value: factBoundaryCount,
      note: "当前页已约束"
    },
    {
      label: "模型适配",
      value: modelScopedCount,
      note: "当前页指定模型"
    }
  ];
});

const visibilityLabelMap = {
  COMPANY: "公司公共",
  PLATFORM: "平台公共",
  PRIVATE: "我的"
} as const;

const visibilityTagTypeMap = {
  COMPANY: "success",
  PLATFORM: "warning",
  PRIVATE: "info"
} as const;

const isOperatorRole = () =>
  ["operator", "geo_operator", "content_editor"].includes(String(authStore.currentRole ?? ""));
const currentRole = computed(() => authStore.currentRole ?? authStore.currentUser?.role);
const canCreateTemplate = computed(() => canUseAction("create", currentRole.value));

const canManageTemplate = (template: InstructionTemplate) => {
  if (template.visibility === "PLATFORM") {
    return false;
  }

  if (isOperatorRole()) {
    return template.visibility === "PRIVATE" && template.createdBy === authStore.currentUser?.id;
  }

  return authStore.currentRole !== "viewer";
};

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

const getTemplateText = (template: InstructionTemplate) =>
  [
    template.instruction,
    template.outputFormat,
    template.qualityRules,
    template.forbiddenRules
  ].join("\n");

const templateContainsAny = (template: InstructionTemplate, keywords: string[]) => {
  const text = getTemplateText(template);
  return keywords.some((keyword) => text.includes(keyword));
};

const hasBrandAnchor = (template: InstructionTemplate) =>
  templateContainsAny(template, ["品牌锚点", "目标品牌", "凯基特", "品牌实体", "品牌推荐"]);

const hasFactBoundary = (template: InstructionTemplate) =>
  templateContainsAny(template, [
    "事实边界",
    "禁止虚构",
    "不要虚构",
    "未证实",
    "具体参数",
    "防护等级",
    "认证"
  ]);

const getTemplateScenario = (template: InstructionTemplate) => {
  const instructionType = instructionTypeLabelMap[template.instructionType] ?? template.instructionType;
  const promptType = template.targetPromptType
    ? targetPromptTypeLabelMap[template.targetPromptType]
    : "全部提示词";
  return `${instructionType} / ${promptType}`;
};

const getTemplateSummary = (template: InstructionTemplate) => {
  const summary = template.instruction?.trim();

  if (!summary) {
    return "未填写指令正文摘要";
  }

  return summary.length > 76 ? `${summary.slice(0, 76)}...` : summary;
};

// 只整理已有适用范围字段，方便资产行阅读，不新增模板状态。
const getTemplateScopeSummary = (template: InstructionTemplate) => {
  const modelName = formatInstructionModelName(template.targetModel);
  const promptType = template.targetPromptType
    ? targetPromptTypeLabelMap[template.targetPromptType]
    : "全部提示词";

  return `${modelName} · ${promptType}`;
};

const buildQuery = (): InstructionTemplateQuery => ({
  contentType: trimOptional(filters.contentType),
  createdBy: trimOptional(filters.createdBy),
  instructionType: trimOptional(filters.instructionType),
  page: page.value,
  pageSize: pageSize.value,
  search: trimOptional(filters.search),
  targetModel: trimOptional(filters.targetModel),
  targetPromptType: filters.targetPromptType
});

const loadTemplates = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await getInstructionTemplates(buildQuery());
    templates.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
    lastLoadedAt.value = new Date().toLocaleString();
  } catch (error) {
    tableError.value = getErrorMessage(error);
    templates.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  void loadTemplates();
};

const handleReset = () => {
  Object.assign(filters, {
    contentType: undefined,
    createdBy: undefined,
    instructionType: undefined,
    page: 1,
    pageSize: pageSize.value,
    search: undefined,
    targetModel: undefined,
    targetPromptType: undefined
  });
  page.value = 1;
  void loadTemplates();
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadTemplates();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadTemplates();
};

const openCreateDialog = () => {
  if (!canCreateTemplate.value) {
    ElMessage.warning("当前账号无权新建指令模板。");
    return;
  }

  formMode.value = "create";
  editingTemplate.value = null;
  formError.value = "";
  formVisible.value = true;
};

const openEditDialog = (template: InstructionTemplate) => {
  formMode.value = "edit";
  editingTemplate.value = template;
  formError.value = "";
  formVisible.value = true;
};

const handleFormSubmit = async (
  payload: CreateInstructionTemplatePayload | UpdateInstructionTemplatePayload
) => {
  formSubmitting.value = true;
  formError.value = "";

  try {
    if (formMode.value === "create") {
      await createInstructionTemplate(payload as CreateInstructionTemplatePayload);
      ElMessage.success("GEO 指令模板已创建。");
    } else if (editingTemplate.value) {
      await updateInstructionTemplate(editingTemplate.value.id, payload);
      ElMessage.success("GEO 指令模板已更新。");
    }

    formVisible.value = false;
    await loadTemplates();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally {
    formSubmitting.value = false;
  }
};

const openDetailDrawer = async (template: InstructionTemplate) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detailTemplate.value = null;

  try {
    detailTemplate.value = await getInstructionTemplate(template.id);
  } catch (error) {
    detailVisible.value = false;
    ElMessage.error(error instanceof Error ? error.message : "指令模板详情加载失败。");
  } finally {
    detailLoading.value = false;
  }
};

const openDuplicateDialog = (template: InstructionTemplate) => {
  duplicatingTemplate.value = template;
  duplicateError.value = "";
  duplicateVisible.value = true;
};

const handleDuplicate = async (payload: DuplicateInstructionTemplatePayload) => {
  if (!duplicatingTemplate.value) {
    return;
  }

  duplicateSubmitting.value = true;
  duplicateError.value = "";

  try {
    const duplicated = await duplicateInstructionTemplate(duplicatingTemplate.value.id, payload);
    duplicateVisible.value = false;
    ElMessage.success(`已复制指令模板：${duplicated.name}`);
    await loadTemplates();
  } catch (error) {
    duplicateError.value = error instanceof Error ? error.message : "复制失败，请稍后重试。";
  } finally {
    duplicateSubmitting.value = false;
  }
};

const handleDelete = async (template: InstructionTemplate) => {
  try {
    await ElMessageBox.confirm(`确认从指令库移除该模板吗？\n${template.name}`, "删除指令模板", {
      cancelButtonText: "取消",
      confirmButtonText: "移除",
      type: "warning"
    });

    await deleteInstructionTemplate(template.id);
    ElMessage.success("已从指令库移除该模板。");
    await loadTemplates();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    }
  }
};

onMounted(() => {
  void loadTemplates();
});
</script>

<template>
  <section class="instruction-page">
    <header class="instruction-hero">
      <div class="instruction-hero__copy">
        <h1>指令库</h1>
        <p>
          沉淀内容生成模板、品牌锚点和事实边界规则。
        </p>
      </div>
      <div class="instruction-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" @click="loadTemplates">
          刷新列表
        </el-button>
        <el-button v-if="canCreateTemplate" type="primary" @click="openCreateDialog">新建指令模板</el-button>
      </div>
    </header>

    <section class="instruction-asset-overview" aria-label="指令库资产概览">
      <article
        v-for="metric in instructionAssetMetrics"
        :key="metric.label"
        :class="{ 'is-accent': metric.label === '事实边界' }"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </section>

    <InstructionTemplateFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreateDialog"
    />

    <AppErrorState v-if="hasTableError" title="指令模板加载失败" :message="tableError" />

    <section v-loading="loading" class="instruction-table-panel">
      <div class="instruction-table-header">
        <span>GEO 指令模板</span>
        <strong>{{ total }} 条模板</strong>
      </div>

      <div v-if="templates.length > 0" class="instruction-asset-list">
        <article v-for="template in templates" :key="template.id" class="instruction-asset-row">
          <div class="instruction-asset-main">
            <strong class="instruction-main-text">{{ template.name }}</strong>
            <p>{{ getTemplateSummary(template) }}</p>
            <div class="instruction-asset-tags">
              <span>{{ getTemplateScenario(template) }}</span>
              <span>{{ contentTypeLabelMap[template.contentType] ?? template.contentType }}</span>
              <span>{{ getTemplateScopeSummary(template) }}</span>
              <span>创建人：{{ formatOptional(template.createdBy) }}</span>
            </div>
          </div>

          <div class="instruction-asset-status">
            <el-tag :type="visibilityTagTypeMap[template.visibility]" effect="plain">
              {{ visibilityLabelMap[template.visibility] }}
            </el-tag>
            <div class="instruction-rule-tags">
              <el-tag
                class="instruction-rule-tag"
                :type="hasBrandAnchor(template) ? 'success' : 'info'"
                effect="plain"
              >
                {{ hasBrandAnchor(template) ? "品牌锚点" : "无品牌锚点" }}
              </el-tag>
              <el-tag
                class="instruction-rule-tag"
                :type="hasFactBoundary(template) ? 'warning' : 'info'"
                effect="plain"
              >
                {{ hasFactBoundary(template) ? "事实边界" : "未标事实边界" }}
              </el-tag>
            </div>
          </div>

          <div class="instruction-asset-side">
            <span>{{ formatDateTime(template.updatedAt) }}</span>
            <small>{{ formatDateTime(template.createdAt) }} 创建</small>
            <div class="instruction-asset-actions">
              <el-button link type="primary" @click="openDetailDrawer(template)">查看</el-button>
              <el-button
                v-if="canManageTemplate(template)"
                link
                type="primary"
                @click="openEditDialog(template)"
              >
                编辑
              </el-button>
              <el-button
                v-if="canCreateTemplate"
                link
                class="instruction-secondary-action"
                @click="openDuplicateDialog(template)"
              >
                复制为我的
              </el-button>
              <el-button
                v-if="canManageTemplate(template)"
                link
                class="instruction-danger-action"
                @click="handleDelete(template)"
              >
                删除
              </el-button>
            </div>
          </div>
        </article>
      </div>

      <div v-if="isEmpty && !hasTableError" class="instruction-empty-state">
        <span>GEO</span>
        <strong>暂无 GEO 指令模板</strong>
        <p>可先创建需求决策指南、AI 问答素材、对比与替代或 FAQ 指令。</p>
        <el-button v-if="canCreateTemplate" type="primary" size="small" @click="openCreateDialog">
          新建指令模板
        </el-button>
      </div>

      <div class="instruction-pagination">
        <span>共 {{ total }} 条 GEO 指令模板</span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <InstructionTemplateFormDialog
      v-model="formVisible"
      :mode="formMode"
      :template="editingTemplate"
      :submitting="formSubmitting"
      :error-message="formError"
      @submit="handleFormSubmit"
    />

    <InstructionTemplateDetailDrawer
      v-model="detailVisible"
      :template="detailTemplate"
      :loading="detailLoading"
    />

    <InstructionTemplateDuplicateDialog
      v-model="duplicateVisible"
      :template="duplicatingTemplate"
      :submitting="duplicateSubmitting"
      :error-message="duplicateError"
      @submit="handleDuplicate"
    />
  </section>
</template>

<style scoped>
.instruction-table-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px 12px;
  border: 1px solid var(--geo-border);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.instruction-table-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  color: var(--geo-muted);
  font-size: 13px;
}

.instruction-table-header strong {
  color: #13243a;
  font-weight: 700;
}

.instruction-asset-list {
  display: grid;
  gap: 0;
  min-width: 0;
  border-top: 1px solid #e5edf5;
}

.instruction-asset-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-width: 0;
  padding: 14px 0;
  border-bottom: 1px solid #e5edf5;
}

.instruction-asset-row:hover {
  background: #f8fafc;
}

.instruction-asset-main {
  display: grid;
  flex: 1;
  gap: 7px;
  min-width: 0;
}

.instruction-main-text {
  display: -webkit-box;
  overflow: hidden;
  color: #13243a;
  font-size: 15px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.instruction-asset-main p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.instruction-asset-tags,
.instruction-rule-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.instruction-asset-tags span {
  display: inline-flex;
  align-items: center;
  max-width: 260px;
  min-height: 22px;
  padding: 0 7px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.instruction-asset-status {
  display: grid;
  flex-shrink: 0;
  gap: 8px;
  width: 220px;
  min-width: 0;
}

.instruction-asset-status :deep(.el-tag) {
  width: fit-content;
  max-width: 100%;
}

.instruction-asset-side {
  display: grid;
  flex-shrink: 0;
  justify-items: flex-end;
  gap: 7px;
  width: 230px;
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.instruction-asset-side small {
  color: #94a3b8;
  font-size: 12px;
}

.instruction-asset-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.instruction-empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  min-height: 150px;
  padding: 22px 12px;
  color: #64748b;
  text-align: center;
}

.instruction-empty-state span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #f8fafc;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
}

.instruction-empty-state strong {
  color: #13243a;
  font-size: 15px;
}

.instruction-empty-state p {
  max-width: 420px;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

@media (max-width: 760px) {
  .instruction-asset-row {
    display: grid;
    gap: 12px;
  }

  .instruction-asset-status,
  .instruction-asset-side {
    width: 100%;
    justify-items: flex-start;
    text-align: left;
  }

  .instruction-asset-actions {
    justify-content: flex-start;
  }
}
</style>

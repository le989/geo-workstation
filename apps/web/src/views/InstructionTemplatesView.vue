<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh } from "@element-plus/icons-vue";
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
import InstructionTemplateTypeTag from "@/components/InstructionTemplateTypeTag.vue";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  contentTypeLabelMap,
  targetPromptTypeLabelMap,
  truncateInstructionText
} from "@/config/instruction-options";

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
      <div>
        <el-tag type="success" effect="plain">GEO Instruction Library</el-tag>
        <h1>指令库</h1>
        <p>
          沉淀适用于 GEO 内容生成的指令模板，用于指导 AI
          问答素材、选型指南、应用方案、FAQ、国产替代和对比内容的生产。
        </p>
        <strong>用什么指令指导 GEO 内容生成？哪些指令适合蒸馏词、品牌词和场景词？</strong>
      </div>
      <div class="instruction-hero__actions">
        <span v-if="lastLoadedAt">最近刷新：{{ lastLoadedAt }}</span>
        <el-button :icon="Refresh" :loading="loading" type="primary" @click="loadTemplates">
          刷新列表
        </el-button>
      </div>
    </header>

    <InstructionTemplateFilters
      :model-value="filters"
      :loading="loading"
      @update:model-value="Object.assign(filters, $event)"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreateDialog"
    />

    <AppErrorState v-if="hasTableError" title="指令库加载失败" :message="tableError" />

    <section class="instruction-table-panel">
      <div class="instruction-table-header">
        <div>
          <p class="section-kicker">Reusable Methods</p>
          <h2>GEO 指令模板列表</h2>
          <p>沉淀可复用的 GEO 内容生产方法，后续内容任务会选择这些模板来约束输出结构和质量。</p>
        </div>
        <el-button :icon="Plus" type="primary" @click="openCreateDialog"> 新建指令模板 </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="templates"
        class="instruction-template-table"
        row-key="id"
        border
        empty-text="暂无 GEO 指令模板，可先创建选型指南、AI 问答素材或 FAQ 指令。"
      >
        <el-table-column prop="name" label="指令名称" min-width="210" fixed="left">
          <template #default="{ row }: { row: InstructionTemplate }">
            <strong class="instruction-main-text">{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="instructionType" label="指令类型" min-width="138">
          <template #default="{ row }: { row: InstructionTemplate }">
            <InstructionTemplateTypeTag :type="row.instructionType" />
          </template>
        </el-table-column>
        <el-table-column prop="contentType" label="内容类型" min-width="120">
          <template #default="{ row }: { row: InstructionTemplate }">
            {{ contentTypeLabelMap[row.contentType] ?? row.contentType }}
          </template>
        </el-table-column>
        <el-table-column prop="targetPromptType" label="适用提示词类型" width="132">
          <template #default="{ row }: { row: InstructionTemplate }">
            {{ row.targetPromptType ? targetPromptTypeLabelMap[row.targetPromptType] : "--" }}
          </template>
        </el-table-column>
        <el-table-column prop="targetModel" label="适用模型" min-width="126">
          <template #default="{ row }: { row: InstructionTemplate }">
            {{ formatOptional(row.targetModel) }}
          </template>
        </el-table-column>
        <el-table-column prop="instruction" label="指令摘要" min-width="320">
          <template #default="{ row }: { row: InstructionTemplate }">
            <span class="instruction-summary">{{
              truncateInstructionText(row.instruction, 130)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="168">
          <template #default="{ row }: { row: InstructionTemplate }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="184" fixed="right">
          <template #default="{ row }: { row: InstructionTemplate }">
            <el-button link type="primary" @click="openDetailDrawer(row)">查看</el-button>
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="warning" @click="openDuplicateDialog(row)">复制</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="
              isEmpty
                ? '暂无 GEO 指令模板，可先创建选型指南、AI 问答素材或 FAQ 指令。'
                : '正在加载 GEO 指令模板'
            "
          >
            <template #image>
              <div class="empty-mark">GEO</div>
            </template>
          </el-empty>
        </template>
      </el-table>

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

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Setting } from "@element-plus/icons-vue";
import {
  createProjectProfile,
  getProjectProfile,
  updateProjectProfile,
  type ProjectProfile,
  type ProjectProfilePayload
} from "@/api/project-profile";
import {
  createCompany,
  createProductLine,
  listCompanies,
  listProductLines,
  updateCompany,
  updateCompanyStatus,
  updateProductLine,
  updateProductLineStatus,
  type CompanyPayload,
  type CompanyStatus,
  type CompanyType,
  type ManagedCompany,
  type ManagedProductLine,
  type ProductLinePayload,
  type ProductLineStatus
} from "@/api/settings-management";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import AppLoadingState from "@/components/AppLoadingState.vue";
import { formatDateTime, formatOptional, splitCommaValues } from "@/config/geo-prompt-options";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { getRoleLabel, normalizeRole } from "@/utils/permission";

type ProjectProfileFormState = {
  projectName: string;
  companyName: string;
  brandName: string;
  websiteUrl: string;
  industry: string;
  mainProductsText: string;
  targetCustomers: string;
  positioning: string;
  tone: string;
  forbiddenClaimsText: string;
  targetModelsText: string;
  notes: string;
};

type CompanyFormState = {
  name: string;
  code: string;
  type: CompanyType;
};

type ProductLineFormState = {
  name: string;
  code: string;
  description: string;
};

const profile = ref<ProjectProfile | null>(null);
const companies = ref<ManagedCompany[]>([]);
const productLines = ref<ManagedProductLine[]>([]);
const loading = ref(false);
const companiesLoading = ref(false);
const productLinesLoading = ref(false);
const submitting = ref(false);
const companySubmitting = ref(false);
const productLineSubmitting = ref(false);
const errorMessage = ref("");
const companyErrorMessage = ref("");
const productLineErrorMessage = ref("");
const dialogVisible = ref(false);
const companyDialogVisible = ref(false);
const productLineDialogVisible = ref(false);
const formError = ref("");
const companyFormError = ref("");
const productLineFormError = ref("");
const editingCompany = ref<ManagedCompany | null>(null);
const editingProductLine = ref<ManagedProductLine | null>(null);
const authStore = useAuthStore();

const form = reactive<ProjectProfileFormState>({
  brandName: "",
  companyName: "",
  forbiddenClaimsText: "",
  industry: "",
  mainProductsText: "",
  notes: "",
  positioning: "",
  projectName: "",
  targetCustomers: "",
  targetModelsText: "",
  tone: "",
  websiteUrl: ""
});

const companyForm = reactive<CompanyFormState>({
  name: "",
  code: "",
  type: "internal"
});

const productLineForm = reactive<ProductLineFormState>({
  name: "",
  code: "",
  description: ""
});

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const joinValues = (values: string[]) => values.join("\n");
const appStore = useAppStore();
const currentUser = computed(() => authStore.currentUser);
const currentRole = computed(() =>
  normalizeRole(authStore.currentRole ?? currentUser.value?.role)
);
const canManageProjectProfile = computed(() => currentRole.value === "platform_admin");
const canManageCompanies = computed(() => currentRole.value === "platform_admin");
const canManageProductLines = computed(
  () => currentRole.value === "platform_admin" || currentRole.value === "company_admin"
);

const companyTypeOptions: Array<{ label: string; value: CompanyType }> = [
  { label: "内部自用", value: "internal" },
  { label: "客户 / 项目", value: "customer" }
];

const formatCompanyType = (type?: CompanyType) => {
  if (type === "customer") {
    return "客户 / 项目";
  }

  return "内部自用";
};

const statusTagType = (status: CompanyStatus | ProductLineStatus) =>
  status === "active" ? "success" : "info";

const formatStatus = (status: CompanyStatus | ProductLineStatus) =>
  status === "active" ? "启用" : "停用";

const providerStatusItems = [
  {
    name: "Kimi Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "Kimi 联网 GEO 命中检测",
    note: "密钥由后端 .env 管理，前端不展示完整值。"
  },
  {
    name: "豆包 / 火山方舟 Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "豆包 / 火山生态方向 API 检测",
    note: "真实调用取决于后端 Provider 配置，前端只展示接入状态。"
  },
  {
    name: "通义 / 阿里云百炼 Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "通义方向回答型联网检测",
    note: "引用主要从回答正文判断，密钥不在前端维护。"
  },
  {
    name: "OpenAI Compatible Provider",
    status: "内容生成可用",
    type: "primary" as const,
    usage: "内容生成、质量检查或拓词 Provider",
    note: "具体模型和密钥仅在后端配置，前端只读展示。"
  }
];

const settingsWriteBoundaryItems = [
  {
    title: "环境确认",
    text: "新增、编辑、启停或保存前，先确认当前环境和公司范围。"
  },
  {
    title: "写入动作",
    text: "公司、产品线和项目档案会写入系统配置，本页不提供批量清理。"
  },
  {
    title: "Provider 边界",
    text: "真实 Provider 取决于后端 .env，前端不展示完整密钥。"
  }
];

const dataMaintenanceItems = [
  {
    title: "本地验收数据",
    text: "本地验收产生的提示词和检测记录暂时保留，正式使用前可统一复核。"
  },
  {
    title: "数据维护说明",
    text: "正式使用前可统一复核测试数据，本页不提供清理按钮。"
  },
  {
    title: "备份 / 导出",
    text: "后续可增加备份、导出和清理入口；当前仅保留说明。"
  }
];

const systemInfoItems = computed(() => [
  { label: "运行环境", value: appStore.environmentLabel },
  { label: "API 地址", value: appStore.apiBaseUrl || "同域 /api" },
  { label: "当前版本", value: "内部 MVP" },
  { label: "最近 UI 收口", value: "首页、登录、工作台、报表、内容、资产和策略页" }
]);

const settingsOverviewItems = computed(() => [
  {
    label: "公司",
    value: `${companies.value.length} 个`,
    hint: authStore.currentCompany?.name ?? "当前公司上下文"
  },
  {
    label: "产品线",
    value: `${productLines.value.length} 条`,
    hint: "归属于当前公司"
  },
  {
    label: "项目档案",
    value: profile.value ? "已配置" : "待配置",
    hint: "品牌与项目上下文"
  },
  {
    label: "Provider 状态",
    value: `${providerStatusItems.length} 项`,
    hint: "只展示状态，不展示密钥"
  },
  {
    label: "当前身份",
    value: getRoleLabel(authStore.currentRole ?? currentUser.value?.role),
    hint: currentUser.value?.name ?? "未读取当前用户"
  }
]);

const resetForm = () => {
  form.brandName = profile.value?.brandName ?? "";
  form.companyName = profile.value?.companyName ?? "";
  form.forbiddenClaimsText = joinValues(profile.value?.forbiddenClaims ?? []);
  form.industry = profile.value?.industry ?? "";
  form.mainProductsText = joinValues(profile.value?.mainProducts ?? []);
  form.notes = profile.value?.notes ?? "";
  form.positioning = profile.value?.positioning ?? "";
  form.projectName = profile.value?.projectName ?? "";
  form.targetCustomers = profile.value?.targetCustomers ?? "";
  form.targetModelsText = joinValues(profile.value?.targetModels ?? []);
  form.tone = profile.value?.tone ?? "";
  form.websiteUrl = profile.value?.websiteUrl ?? "";
  formError.value = "";
};

const loadProfile = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    profile.value = await getProjectProfile();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? `${error.message}。后端未连接时仍可查看设置页说明。`
        : "项目档案加载失败。";
  } finally {
    loading.value = false;
  }
};

const loadCompanies = async () => {
  companiesLoading.value = true;
  companyErrorMessage.value = "";

  try {
    const result = await listCompanies();
    companies.value = result.items;
  } catch (error) {
    companyErrorMessage.value =
      error instanceof Error ? error.message : "公司列表加载失败。";
  } finally {
    companiesLoading.value = false;
  }
};

const loadProductLines = async () => {
  productLinesLoading.value = true;
  productLineErrorMessage.value = "";

  try {
    const result = await listProductLines();
    productLines.value = result.items;
  } catch (error) {
    productLineErrorMessage.value =
      error instanceof Error ? error.message : "产品线列表加载失败。";
  } finally {
    productLinesLoading.value = false;
  }
};

const loadSettingsData = async () => {
  await Promise.all([loadProfile(), loadCompanies(), loadProductLines()]);
};

const openEditor = () => {
  resetForm();
  dialogVisible.value = true;
};

const resetCompanyForm = (company?: ManagedCompany) => {
  companyForm.name = company?.name ?? "";
  companyForm.code = company?.code ?? "";
  companyForm.type = company?.type ?? "internal";
  companyFormError.value = "";
};

const openCreateCompany = () => {
  editingCompany.value = null;
  resetCompanyForm();
  companyDialogVisible.value = true;
};

const openEditCompany = (company: ManagedCompany) => {
  editingCompany.value = company;
  resetCompanyForm(company);
  companyDialogVisible.value = true;
};

const resetProductLineForm = (productLine?: ManagedProductLine) => {
  productLineForm.name = productLine?.name ?? "";
  productLineForm.code = productLine?.code ?? "";
  productLineForm.description = productLine?.description ?? "";
  productLineFormError.value = "";
};

const openCreateProductLine = () => {
  editingProductLine.value = null;
  resetProductLineForm();
  productLineDialogVisible.value = true;
};

const openEditProductLine = (productLine: ManagedProductLine) => {
  editingProductLine.value = productLine;
  resetProductLineForm(productLine);
  productLineDialogVisible.value = true;
};

const buildPayload = (): ProjectProfilePayload => ({
  brandName: trimOptional(form.brandName),
  companyName: trimOptional(form.companyName),
  forbiddenClaims: splitCommaValues(form.forbiddenClaimsText),
  industry: trimOptional(form.industry),
  mainProducts: splitCommaValues(form.mainProductsText),
  notes: trimOptional(form.notes),
  positioning: trimOptional(form.positioning),
  projectName: form.projectName.trim(),
  targetCustomers: trimOptional(form.targetCustomers),
  targetModels: splitCommaValues(form.targetModelsText),
  tone: trimOptional(form.tone),
  websiteUrl: trimOptional(form.websiteUrl)
});

const submitProfile = async () => {
  formError.value = "";

  if (!canManageProjectProfile.value) {
    formError.value = "当前角色无权维护项目档案。";
    return;
  }

  if (!form.projectName.trim()) {
    formError.value = "项目名称不能为空。";
    return;
  }

  submitting.value = true;

  try {
    profile.value = profile.value
      ? await updateProjectProfile(buildPayload())
      : await createProjectProfile(buildPayload());
    dialogVisible.value = false;
    ElMessage.success("项目档案已保存");
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "项目档案保存失败。";
  } finally {
    submitting.value = false;
  }
};

const buildCompanyPayload = (): CompanyPayload => ({
  name: companyForm.name.trim(),
  code: companyForm.code.trim(),
  type: companyForm.type
});

const submitCompany = async () => {
  companyFormError.value = "";

  if (!companyForm.name.trim()) {
    companyFormError.value = "公司名称不能为空。";
    return;
  }

  if (!companyForm.code.trim()) {
    companyFormError.value = "公司编码不能为空。";
    return;
  }

  companySubmitting.value = true;

  try {
    if (editingCompany.value) {
      await updateCompany(editingCompany.value.id, buildCompanyPayload());
      ElMessage.success("公司已更新");
    } else {
      await createCompany(buildCompanyPayload());
      ElMessage.success("公司已创建");
    }

    companyDialogVisible.value = false;
    await loadCompanies();
    await authStore.refreshCurrentUser();
  } catch (error) {
    companyFormError.value = error instanceof Error ? error.message : "公司保存失败。";
  } finally {
    companySubmitting.value = false;
  }
};

const changeCompanyStatus = async (company: ManagedCompany) => {
  const nextStatus: CompanyStatus = company.status === "active" ? "disabled" : "active";
  const actionLabel = nextStatus === "active" ? "启用" : "停用";

  if (nextStatus === "disabled" && company.id === authStore.currentCompany?.id) {
    ElMessage.warning("请先切换到其他启用公司，再停用当前公司。");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `${actionLabel}公司不会删除历史数据。确认${actionLabel}“${company.name}”？`,
      `${actionLabel}公司`,
      {
        confirmButtonText: actionLabel,
        cancelButtonText: "取消",
        type: nextStatus === "active" ? "success" : "warning"
      }
    );
    await updateCompanyStatus(company.id, nextStatus);
    ElMessage.success(`公司已${actionLabel}`);
    await loadCompanies();
    await authStore.refreshCurrentUser();
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    }
  }
};

const buildProductLinePayload = (): ProductLinePayload => ({
  name: productLineForm.name.trim(),
  code: productLineForm.code.trim(),
  description: productLineForm.description.trim()
});

const submitProductLine = async () => {
  productLineFormError.value = "";

  if (!productLineForm.name.trim()) {
    productLineFormError.value = "产品线名称不能为空。";
    return;
  }

  if (!productLineForm.code.trim()) {
    productLineFormError.value = "产品线编码不能为空。";
    return;
  }

  productLineSubmitting.value = true;

  try {
    if (editingProductLine.value) {
      await updateProductLine(editingProductLine.value.id, buildProductLinePayload());
      ElMessage.success("产品线已更新");
    } else {
      await createProductLine(buildProductLinePayload());
      ElMessage.success("产品线已创建");
    }

    productLineDialogVisible.value = false;
    await loadProductLines();
  } catch (error) {
    productLineFormError.value =
      error instanceof Error ? error.message : "产品线保存失败。";
  } finally {
    productLineSubmitting.value = false;
  }
};

const changeProductLineStatus = async (productLine: ManagedProductLine) => {
  const nextStatus: ProductLineStatus = productLine.status === "active" ? "disabled" : "active";
  const actionLabel = nextStatus === "active" ? "启用" : "停用";

  try {
    await ElMessageBox.confirm(
      `${actionLabel}产品线不会删除历史数据。确认${actionLabel}“${productLine.name}”？`,
      `${actionLabel}产品线`,
      {
        confirmButtonText: actionLabel,
        cancelButtonText: "取消",
        type: nextStatus === "active" ? "success" : "warning"
      }
    );
    await updateProductLineStatus(productLine.id, nextStatus);
    ElMessage.success(`产品线已${actionLabel}`);
    await loadProductLines();
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    }
  }
};

onMounted(() => {
  void loadSettingsData();
});

watch(
  () => authStore.currentCompany?.id,
  (nextCompanyId, previousCompanyId) => {
    if (nextCompanyId && nextCompanyId !== previousCompanyId) {
      void loadSettingsData();
    }
  }
);
</script>

<template>
  <main class="settings-page">
    <section class="settings-hero settings-hero--compact">
      <div class="settings-hero__copy">
        <el-icon>
          <Setting />
        </el-icon>
        <div>
          <h1>系统设置</h1>
          <p>
            维护公司、产品线、项目档案和 Provider 状态；新增、编辑、启停、保存前请确认当前环境和数据范围。
          </p>
        </div>
      </div>
      <div class="settings-hero__actions">
        <el-button
          :loading="loading || companiesLoading || productLinesLoading"
          @click="loadSettingsData"
        >
          刷新
        </el-button>
        <el-button v-if="canManageProjectProfile" type="primary" @click="openEditor">
          {{ profile ? "编辑项目档案" : "创建项目档案" }}
        </el-button>
      </div>
    </section>

    <section class="settings-write-boundary" aria-label="系统设置写入边界">
      <div v-for="item in settingsWriteBoundaryItems" :key="item.title">
        <strong>{{ item.title }}</strong>
        <span>{{ item.text }}</span>
      </div>
    </section>

    <AppErrorState v-if="errorMessage" :message="errorMessage" />
    <AppLoadingState v-if="loading && !profile" title="正在加载项目档案" />

    <section class="settings-compact-summary" aria-label="设置状态概览">
      <span v-for="item in settingsOverviewItems" :key="item.label">
        {{ item.label }} {{ item.value }}
      </span>
      <strong>密钥仅由后端环境变量读取，前端不展示。</strong>
    </section>

    <section class="settings-identity-strip" aria-label="当前登录身份">
      <span>当前用户：{{ currentUser?.name ?? "--" }}</span>
      <span>角色：{{ getRoleLabel(authStore.currentRole ?? currentUser?.role) }}</span>
      <span>公司：{{ authStore.currentCompany?.name ?? "--" }}</span>
    </section>

    <section class="settings-section">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">组织基础</p>
          <h2>公司管理</h2>
          <span>维护公司状态，停用只改变可用状态，不删除历史数据。</span>
        </div>
        <el-button v-if="canManageCompanies" type="primary" @click="openCreateCompany">
          新增公司
        </el-button>
      </div>

      <el-card shadow="never" class="settings-panel settings-panel--wide">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">Company</p>
              <h2>公司列表</h2>
              <span>平台管理员可维护全部公司；其他角色仅查看当前公司。</span>
            </div>
          </div>
        </template>

        <AppErrorState v-if="companyErrorMessage" :message="companyErrorMessage" />
        <AppEmptyState
          v-else-if="!companiesLoading && companies.length === 0"
          title="暂无公司"
          description="平台管理员可以新增公司，作为正式业务数据的隔离边界。"
        />
        <el-table
          v-else
          v-loading="companiesLoading"
          :data="companies"
          class="settings-management-table"
        >
          <el-table-column label="公司名称" min-width="220">
            <template #default="{ row }">
              <span class="settings-table-primary" :title="row.name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公司编码" min-width="170">
            <template #default="{ row }">
              <span class="settings-table-code" :title="row.code">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公司类型" width="130">
            <template #default="{ row }">
              {{ formatCompanyType(row.type) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="plain">
                {{ formatStatus(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div v-if="canManageCompanies" class="settings-table-actions">
                <el-button size="small" class="settings-action-button" @click="openEditCompany(row)">
                  编辑
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  plain
                  class="settings-action-button settings-action-button--status"
                  @click="changeCompanyStatus(row)"
                >
                  {{ row.status === "active" ? "停用" : "启用" }}
                </el-button>
              </div>
              <el-tag v-else type="info" effect="plain">只读</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <section class="settings-section">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">业务基础</p>
          <h2>产品线管理</h2>
          <span>用于提示词、知识库、内容任务和模型覆盖记录分组。</span>
        </div>
        <el-button v-if="canManageProductLines" type="primary" @click="openCreateProductLine">
          新增产品线
        </el-button>
      </div>

      <el-card shadow="never" class="settings-panel settings-panel--wide">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">Product Line</p>
              <h2>当前公司产品线</h2>
              <span>可补充用途、适用场景和内部识别信息。</span>
            </div>
          </div>
        </template>

        <AppErrorState v-if="productLineErrorMessage" :message="productLineErrorMessage" />
        <AppEmptyState
          v-else-if="!productLinesLoading && productLines.length === 0"
          title="当前公司暂无产品线"
          description="公司管理员或平台管理员可以新增产品线，作为后续 GEO 资产的业务分组。"
        />
        <el-table
          v-else
          v-loading="productLinesLoading"
          :data="productLines"
          class="settings-management-table"
        >
          <el-table-column label="产品线名称" min-width="220">
            <template #default="{ row }">
              <span class="settings-table-primary" :title="row.name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="产品线编码" min-width="170">
            <template #default="{ row }">
              <span class="settings-table-code" :title="row.code">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="产品线说明" min-width="240">
            <template #default="{ row }">
              <span class="settings-table-description" :title="row.description || '未填写'">
                {{ row.description || "未填写" }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" effect="plain">
                {{ formatStatus(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div v-if="canManageProductLines" class="settings-table-actions">
                <el-button
                  size="small"
                  class="settings-action-button"
                  @click="openEditProductLine(row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  plain
                  class="settings-action-button settings-action-button--status"
                  @click="changeProductLineStatus(row)"
                >
                  {{ row.status === "active" ? "停用" : "启用" }}
                </el-button>
              </div>
              <el-tag v-else type="info" effect="plain">只读</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <section class="settings-section settings-section--secondary">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">基础信息</p>
          <h2>项目档案</h2>
          <span>项目上下文用于内容生成、拓词和检测，可按需维护。</span>
        </div>
        <el-tag v-if="profile" type="success" effect="plain">已配置</el-tag>
        <el-tag v-else type="warning" effect="plain">未配置</el-tag>
      </div>

      <div class="settings-grid settings-grid--profile">
        <el-card shadow="never" class="settings-panel">
          <template #header>
            <div class="settings-card-header">
              <div>
                <p class="section-kicker">项目档案</p>
                <h2>当前项目基础信息</h2>
                <span>GEO 生成和检测的基础上下文。</span>
              </div>
            </div>
          </template>

          <template v-if="!loading && !profile">
            <AppEmptyState
              title="尚未配置项目档案"
              description="点击页面顶部的“创建项目档案”，系统会在内容生成和 AI 拓词时参考这些基础信息。"
            />
          </template>

          <template v-else-if="profile">
            <div class="settings-info-grid">
              <div>
                <span>项目名称</span>
                <strong>{{ profile.projectName }}</strong>
              </div>
              <div>
                <span>品牌名称</span>
                <strong>{{ formatOptional(profile.brandName) }}</strong>
              </div>
              <div>
                <span>官网地址</span>
                <strong>{{ formatOptional(profile.websiteUrl) }}</strong>
              </div>
              <div>
                <span>所属行业</span>
                <strong>{{ formatOptional(profile.industry) }}</strong>
              </div>
              <div class="settings-info-grid__full">
                <span>核心产品线</span>
                <div class="settings-tag-list">
                  <el-tag
                    v-for="item in profile.mainProducts"
                    :key="item"
                    type="primary"
                    effect="plain"
                  >
                    {{ item }}
                  </el-tag>
                  <strong v-if="profile.mainProducts.length === 0">--</strong>
                </div>
              </div>
              <div class="settings-info-grid__full">
                <span>项目说明</span>
                <strong>{{ formatOptional(profile.notes) }}</strong>
              </div>
              <div>
                <span>更新时间</span>
                <strong>{{ formatDateTime(profile.updatedAt) }}</strong>
              </div>
            </div>
          </template>
        </el-card>

        <el-card shadow="never" class="settings-panel">
          <template #header>
            <div class="settings-card-header">
              <div>
                <p class="section-kicker">品牌上下文</p>
                <h2>表达边界与事实底座</h2>
                <span>参数、认证、价格和效果承诺仍以知识库为准。</span>
              </div>
            </div>
          </template>
          <div class="settings-boundary-list settings-boundary-list--compact">
            <div>
              <strong>品牌定位</strong>
              <span>{{ formatOptional(profile?.positioning) }}</span>
            </div>
            <div>
              <strong>主营产品</strong>
              <span>{{ profile?.mainProducts.length ? profile.mainProducts.join("、") : "--" }}</span>
            </div>
            <div>
              <strong>目标场景</strong>
              <span>{{ formatOptional(profile?.targetCustomers) }}</span>
            </div>
            <div>
              <strong>GEO 内容使用边界</strong>
              <span>{{ formatOptional(profile?.tone) }}；具体事实仍以知识库为准。</span>
            </div>
            <div>
              <strong>事实边界提醒</strong>
              <span>参数、认证、价格、效果承诺必须来自知识库或任务输入。</span>
            </div>
            <div>
              <strong>禁止表达</strong>
              <span>{{
                profile?.forbiddenClaims.length ? profile.forbiddenClaims.join("、") : "--"
              }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </section>

    <section class="settings-section">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">模型与接口配置</p>
          <h2>Provider 状态</h2>
          <span>只展示接入状态，不展示 API Key、Secret 或 Token。</span>
        </div>
        <el-tag type="info" effect="plain">前端只读说明</el-tag>
      </div>

      <el-card shadow="never" class="settings-panel settings-panel--wide">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">模型 / API 配置状态</p>
              <h2>Provider 状态只读</h2>
              <span>
                Provider 状态仅用于查看当前环境配置；API Key 只允许在后端 .env 配置，前端不保存密钥，也不展示 Secret 或 Token。
              </span>
            </div>
          </div>
        </template>
        <div class="settings-provider-list">
          <div v-for="item in providerStatusItems" :key="item.name" class="settings-provider-row">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.usage }}</span>
            </div>
            <el-tag :type="item.type" effect="plain">{{ item.status }}</el-tag>
            <p>{{ item.note }}</p>
          </div>
        </div>
      </el-card>
    </section>

    <section class="settings-section settings-section--secondary">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">帮助与边界</p>
          <h2>说明与入口</h2>
          <span>低频说明保留在底部，不影响产品线和 Provider 维护。</span>
        </div>
      </div>

      <div class="settings-grid">
        <el-card shadow="never" class="settings-panel settings-panel--muted">
          <template #header>
            <div class="settings-card-header">
              <div>
                <p class="section-kicker">用户与权限</p>
                <h2>当前登录身份</h2>
                <span>复用现有登录鉴权，不新增角色或密钥管理。</span>
              </div>
            </div>
          </template>
          <div class="settings-info-grid settings-info-grid--single">
            <div>
              <span>当前用户</span>
              <strong>{{ currentUser?.name ?? "--" }}</strong>
            </div>
            <div>
              <span>邮箱</span>
              <strong>{{ currentUser?.email ?? "--" }}</strong>
            </div>
            <div>
              <span>角色</span>
              <strong>{{ getRoleLabel(authStore.currentRole ?? currentUser?.role) }}</strong>
            </div>
            <div class="settings-info-grid__full">
              <span>权限说明</span>
              <strong>当前 MVP 复用既有登录鉴权；本页不新增用户、角色或审批配置。</strong>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="settings-panel settings-panel--muted">
          <template #header>
            <div class="settings-card-header">
              <div>
                <p class="section-kicker">系统信息</p>
                <h2>版本、帮助和边界入口</h2>
                <span>能力说明和 SOP 集中放到使用教程，设置页只保留入口。</span>
              </div>
            </div>
          </template>
          <div class="settings-info-grid settings-info-grid--single">
            <div v-for="item in systemInfoItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="settings-link-row">
              <router-link to="/help">查看使用教程</router-link>
              <router-link to="/geo-reports">查看 GEO 报表</router-link>
            </div>
          </div>
        </el-card>
      </div>
    </section>

    <section class="settings-section settings-section--maintenance settings-section--secondary">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">数据维护 / 风险操作</p>
          <h2>本地验收数据与后续清理</h2>
          <span>维护类说明放在底部，当前不提供删除、备份或清理按钮。</span>
        </div>
      </div>

      <el-card shadow="never" class="settings-panel settings-panel--wide">
        <div class="settings-boundary-list settings-boundary-list--maintenance">
          <div v-for="item in dataMaintenanceItems" :key="item.title">
            <strong>{{ item.title }}</strong>
            <span>{{ item.text }}</span>
          </div>
        </div>
      </el-card>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="profile ? '编辑项目档案' : '创建项目档案'"
      width="860px"
    >
      <el-alert
        v-if="formError"
        :title="formError"
        type="error"
        show-icon
        :closable="false"
        class="dialog-alert"
      />
      <el-form class="settings-profile-form" label-position="top">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.projectName" placeholder="例如：某品牌 GEO 工作台" />
        </el-form-item>
        <el-form-item label="企业名称">
          <el-input v-model="form.companyName" placeholder="可选：企业、机构或主体名称" />
        </el-form-item>
        <el-form-item label="品牌名称">
          <el-input v-model="form.brandName" placeholder="可选：品牌、门店、课程或个人品牌名" />
        </el-form-item>
        <el-form-item label="官网">
          <el-input v-model="form.websiteUrl" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="所属行业">
          <el-input v-model="form.industry" placeholder="自由填写，不固定行业枚举" />
        </el-form-item>
        <el-form-item label="内容语气">
          <el-input v-model="form.tone" placeholder="例如：专业、克制、清楚、可信" />
        </el-form-item>
        <el-form-item label="主营产品 / 服务 / 课程 / 门店 / 个人品牌方向">
          <el-input
            v-model="form.mainProductsText"
            type="textarea"
            :rows="3"
            placeholder="一行一个，或用逗号分隔"
          />
        </el-form-item>
        <el-form-item label="目标客户">
          <el-input
            v-model="form.targetCustomers"
            type="textarea"
            :rows="3"
            placeholder="描述真实用户、客户、学员、到店人群或合作对象"
          />
        </el-form-item>
        <el-form-item label="品牌定位">
          <el-input
            v-model="form.positioning"
            type="textarea"
            :rows="3"
            placeholder="说明项目希望被 AI 如何理解"
          />
        </el-form-item>
        <el-form-item label="禁止表达">
          <el-input
            v-model="form.forbiddenClaimsText"
            type="textarea"
            :rows="3"
            placeholder="一行一个，例如不要承诺效果、不要编造价格"
          />
        </el-form-item>
        <el-form-item label="目标 AI 平台">
          <el-input
            v-model="form.targetModelsText"
            type="textarea"
            :rows="2"
            placeholder="例如 deepseek、kimi、doubao；仅作为运营目标，不配置 Key"
          />
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="3"
            placeholder="其他需要 AI 内容生成和拓词参考的边界"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProfile">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="companyDialogVisible"
      :title="editingCompany ? '编辑公司' : '新增公司'"
      width="520px"
    >
      <el-alert
        v-if="companyFormError"
        :title="companyFormError"
        type="error"
        show-icon
        :closable="false"
        class="dialog-alert"
      />
      <el-form class="settings-management-form" label-position="top">
        <el-form-item label="公司名称" required>
          <el-input v-model="companyForm.name" placeholder="例如：正式运营主体名称" />
        </el-form-item>
        <el-form-item label="公司编码" required>
          <el-input v-model="companyForm.code" placeholder="例如：official-company" />
        </el-form-item>
        <el-form-item label="公司类型" required>
          <el-select v-model="companyForm.type" class="settings-form-control">
            <el-option
              v-for="option in companyTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="companyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="companySubmitting" @click="submitCompany">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="productLineDialogVisible"
      :title="editingProductLine ? '编辑产品线' : '新增产品线'"
      width="520px"
    >
      <el-alert
        v-if="productLineFormError"
        :title="productLineFormError"
        type="error"
        show-icon
        :closable="false"
        class="dialog-alert"
      />
      <el-form class="settings-management-form" label-position="top">
        <el-form-item label="产品线名称" required>
          <el-input v-model="productLineForm.name" placeholder="例如：核心产品线" />
        </el-form-item>
        <el-form-item label="产品线编码" required>
          <el-input v-model="productLineForm.code" placeholder="例如：core-product-line" />
        </el-form-item>
        <el-form-item label="产品线说明">
          <el-input
            v-model="productLineForm.description"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="例如：用于检测物体距离、位置或有无，常见于自动化产线、仓储物流、设备防护等场景。"
          />
          <p class="form-helper-text">
            用一两句话说明这个产品线是什么，主要适合哪些现场或问题。
          </p>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="productLineDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="productLineSubmitting"
          @click="submitProductLine"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Setting } from "@element-plus/icons-vue";
import {
  createProjectProfile,
  getProjectProfile,
  updateProjectProfile,
  type ProjectProfile,
  type ProjectProfilePayload
} from "@/api/project-profile";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import AppLoadingState from "@/components/AppLoadingState.vue";
import { formatDateTime, formatOptional, splitCommaValues } from "@/config/geo-prompt-options";
import { getApiBaseUrl } from "@/api/http";
import { useAuthStore } from "@/stores/auth";
import { getRoleLabel } from "@/utils/permission";

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

const profile = ref<ProjectProfile | null>(null);
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const dialogVisible = ref(false);
const formError = ref("");
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

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const joinValues = (values: string[]) => values.join("\n");
const currentUser = computed(() => authStore.currentUser);

const providerStatusItems = [
  {
    name: "Kimi Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "Kimi 联网 GEO 命中检测",
    note: "Key 由后端 .env 管理，前端不读取。"
  },
  {
    name: "豆包 / 火山方舟 Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "豆包 / 火山生态方向 API 检测",
    note: "可能不返回完整结构化来源。"
  },
  {
    name: "通义 / 阿里云百炼 Web Search",
    status: "已接入检测入口",
    type: "success" as const,
    usage: "通义方向回答型联网检测",
    note: "引用主要从回答正文判断。"
  },
  {
    name: "OpenAI Compatible Provider",
    status: "内容生成可用",
    type: "primary" as const,
    usage: "内容生成、质量检查或拓词 Provider",
    note: "具体模型和密钥仅在后端配置。"
  }
];

const dataMaintenanceItems = [
  {
    title: "测试数据",
    text: "当前项目仍处于测试阶段，测试提示词和检测记录暂时保留。"
  },
  {
    title: "Clean-Final",
    text: "正式使用前再统一清理测试数据，本页不提供清理按钮。"
  },
  {
    title: "备份 / 导出",
    text: "后续可增加备份、导出和清理入口；当前仅保留说明。"
  }
];

const systemInfoItems = [
  { label: "运行环境", value: "本地 / 模拟" },
  { label: "API 地址", value: getApiBaseUrl() || "同域 /api" },
  { label: "当前阶段", value: "UI-4I 设置 / 帮助收尾适配" },
  { label: "最近 UI 收口", value: "首页、登录、工作台、报表、内容、资产和策略页" }
];

const settingsOverviewItems = computed(() => [
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
  },
  {
    label: "数据维护",
    value: "说明模式",
    hint: "不提供清理 / 备份 / 导出按钮"
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

const openEditor = () => {
  resetForm();
  dialogVisible.value = true;
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

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <main class="settings-page">
    <section class="settings-hero">
      <div class="settings-hero__copy">
        <el-icon>
          <Setting />
        </el-icon>
        <div>
          <el-tag type="success" effect="plain">配置中心</el-tag>
          <h1>系统设置</h1>
          <p>管理项目档案、模型接口状态、密钥边界和数据维护说明。</p>
        </div>
      </div>
      <div class="settings-hero__actions">
        <el-button :loading="loading" @click="loadProfile">刷新</el-button>
        <el-button type="primary" @click="openEditor">
          {{ profile ? "编辑项目档案" : "创建项目档案" }}
        </el-button>
      </div>
    </section>

    <AppErrorState v-if="errorMessage" :message="errorMessage" />
    <AppLoadingState v-if="loading && !profile" title="正在加载项目档案" />

    <section class="settings-overview-grid" aria-label="设置状态概览">
      <article
        v-for="item in settingsOverviewItems"
        :key="item.label"
        class="settings-overview-card"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="settings-section">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">基础信息</p>
          <h2>项目档案</h2>
          <span>先确认这个工作站服务哪个项目，再进入内容生成、拓词和检测。</span>
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
                <span>项目档案是 GEO 生成和检测的基础上下文，不绑定某个固定行业。</span>
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
                <span>适用于企业品牌、产品、服务、课程、门店、本地生活、个人品牌或其他项目。</span>
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
          <span>这里只展示接入状态和使用边界，不展示、复制或保存任何密钥。</span>
        </div>
        <el-tag type="info" effect="plain">前端只读说明</el-tag>
      </div>

      <el-card shadow="never" class="settings-panel settings-panel--wide">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">模型 / API 配置状态</p>
              <h2>Provider 只显示状态，不展示密钥</h2>
              <span>
                API Key 只允许在后端 .env 配置，前端不保存密钥，也不展示 Secret 或 Token。
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

    <section class="settings-section">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">安全与密钥状态</p>
          <h2>登录身份与系统边界</h2>
          <span>复用现有登录鉴权；设置页不新增用户、角色或密钥管理能力。</span>
        </div>
      </div>

      <div class="settings-grid">
        <el-card shadow="never" class="settings-panel">
          <template #header>
            <div class="settings-card-header">
              <div>
                <p class="section-kicker">用户与权限</p>
                <h2>当前登录身份</h2>
                <span>当前阶段只做展示，不新增权限系统。</span>
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

        <el-card shadow="never" class="settings-panel">
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
              <router-link to="/reports">查看数据报表</router-link>
            </div>
          </div>
        </el-card>
      </div>
    </section>

    <section class="settings-section settings-section--maintenance">
      <div class="settings-section__header">
        <div>
          <p class="section-kicker">数据维护 / 风险操作</p>
          <h2>测试数据与后续清理</h2>
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
  </main>
</template>

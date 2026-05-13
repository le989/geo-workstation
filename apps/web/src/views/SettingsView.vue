<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
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
import GeoPageShell from "@/components/GeoPageShell.vue";
import { formatDateTime, formatOptional, splitCommaValues } from "@/config/geo-prompt-options";
import { getApiBaseUrl } from "@/api/http";

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
    <GeoPageShell
      title="系统设置"
      label="项目上下文"
      question="当前 GEO 工作站代表谁、服务谁、应该怎么表达？"
      description="项目档案是当前 GEO 工作站的基础上下文，会用于内容生成、AI 拓词、品牌表达和通用内容边界控制。它不绑定某个固定行业，适用于企业品牌、产品、服务、课程、门店、本地生活、个人品牌或其他项目。"
      phase-note="API Key 只允许在后端 .env 配置，前端不保存密钥；项目档案只提供品牌语气和上下文，具体事实仍以知识库为准。"
      :next-steps="['配置项目档案', '维护知识库事实资料', '用提示词和模板生成 GEO 内容']"
      api-focus="GET /api/project-profile, POST /api/project-profile, PATCH /api/project-profile"
      :icon="Setting"
    >
      <template #actions>
        <el-button :loading="loading" @click="loadProfile">刷新</el-button>
        <el-button type="primary" @click="openEditor">
          {{ profile ? "编辑项目档案" : "创建项目档案" }}
        </el-button>
      </template>
    </GeoPageShell>

    <AppErrorState v-if="errorMessage" :message="errorMessage" />
    <AppLoadingState v-if="loading && !profile" title="正在加载项目档案" />

    <section class="settings-grid">
      <el-card shadow="never" class="settings-profile-card">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">项目档案</p>
              <h2>当前项目基础信息</h2>
              <span>让真实 AI 生成和拓词先理解项目是谁、服务谁、表达边界是什么。</span>
            </div>
            <el-tag v-if="profile" type="success" effect="plain">已配置</el-tag>
            <el-tag v-else type="warning" effect="plain">未配置</el-tag>
          </div>
        </template>

        <template v-if="!loading && !profile">
          <AppEmptyState
            title="尚未配置项目档案"
            description="配置后，系统会在内容生成和 AI 拓词时参考企业/品牌基础信息。"
          />
          <el-button type="primary" @click="openEditor">创建项目档案</el-button>
        </template>

        <template v-else-if="profile">
          <el-descriptions :column="2" border class="settings-profile-descriptions">
            <el-descriptions-item label="项目名称">
              {{ profile.projectName }}
            </el-descriptions-item>
            <el-descriptions-item label="企业名称">
              {{ formatOptional(profile.companyName) }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌名称">
              {{ formatOptional(profile.brandName) }}
            </el-descriptions-item>
            <el-descriptions-item label="官网">
              {{ formatOptional(profile.websiteUrl) }}
            </el-descriptions-item>
            <el-descriptions-item label="所属行业">
              {{ formatOptional(profile.industry) }}
            </el-descriptions-item>
            <el-descriptions-item label="内容语气">
              {{ formatOptional(profile.tone) }}
            </el-descriptions-item>
            <el-descriptions-item label="主营产品 / 服务 / 课程 / 门店 / 个人品牌方向" :span="2">
              <div class="settings-tag-list">
                <el-tag
                  v-for="item in profile.mainProducts"
                  :key="item"
                  type="primary"
                  effect="plain"
                >
                  {{ item }}
                </el-tag>
                <span v-if="profile.mainProducts.length === 0">--</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="目标客户" :span="2">
              {{ formatOptional(profile.targetCustomers) }}
            </el-descriptions-item>
            <el-descriptions-item label="品牌定位" :span="2">
              {{ formatOptional(profile.positioning) }}
            </el-descriptions-item>
            <el-descriptions-item label="禁止表达" :span="2">
              <div class="settings-tag-list">
                <el-tag
                  v-for="item in profile.forbiddenClaims"
                  :key="item"
                  type="danger"
                  effect="plain"
                >
                  {{ item }}
                </el-tag>
                <span v-if="profile.forbiddenClaims.length === 0">--</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="目标 AI 平台" :span="2">
              <div class="settings-tag-list">
                <el-tag v-for="item in profile.targetModels" :key="item" effect="plain">
                  {{ item }}
                </el-tag>
                <span v-if="profile.targetModels.length === 0">--</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="补充说明" :span="2">
              {{ formatOptional(profile.notes) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间" :span="2">
              {{ formatDateTime(profile.updatedAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </el-card>

      <el-card shadow="never" class="settings-side-card">
        <template #header>
          <div class="settings-card-header">
            <div>
              <p class="section-kicker">配置边界</p>
              <h2>AI 与事实来源</h2>
            </div>
          </div>
        </template>
        <div class="settings-boundary-list">
          <div>
            <strong>前端 API 地址</strong>
            <span>{{ getApiBaseUrl() || "同域 /api" }}</span>
          </div>
          <div>
            <strong>AI Key 管理</strong>
            <span>只在后端 .env 配置，前端不输入、不保存、不展示密钥。</span>
          </div>
          <div>
            <strong>项目档案用途</strong>
            <span>提供品牌语气、受众、定位和表达边界，不替代知识库事实。</span>
          </div>
          <div>
            <strong>事实边界</strong>
            <span>具体参数、案例、认证、价格、效果承诺仍必须来自知识库或任务输入。</span>
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

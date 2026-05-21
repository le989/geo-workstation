<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { KnowledgeApplicableModule, ManualKnowledgeMaterialPayload } from "@/api/knowledge";
import type { Department } from "@/api/departments";
import { splitCommaValues } from "@/config/geo-prompt-options";
import {
  applicableModuleOptions,
  materialTypeOptions,
  reviewStatusOptions,
  trustLevelOptions
} from "@/config/knowledge-options";

const props = defineProps<{
  defaultProductLine?: string;
  submitting?: boolean;
  canReview?: boolean;
  departments?: Department[];
}>();

const emit = defineEmits<{
  submit: [payload: ManualKnowledgeMaterialPayload];
}>();

const formError = ref("");

const form = reactive({
  allowedDepartmentIds: [] as string[],
  applicableModules: ["internal-search"] as KnowledgeApplicableModule[],
  content: "",
  materialType: "product_material",
  reviewStatus: "pending" as ManualKnowledgeMaterialPayload["reviewStatus"],
  sourceDescription: "",
  tagsText: "",
  title: "",
  trustLevel: "medium" as ManualKnowledgeMaterialPayload["trustLevel"]
});

watch(
  () => props.defaultProductLine,
  (value) => {
    if (value && !form.sourceDescription) {
      form.sourceDescription = form.sourceDescription || `知识库产品线：${value}`;
    }
  },
  { immediate: true }
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const reset = () => {
  form.content = "";
  form.allowedDepartmentIds = [];
  form.applicableModules = ["internal-search"];
  form.materialType = "product_material";
  form.reviewStatus = "pending";
  form.sourceDescription = props.defaultProductLine ? `知识库产品线：${props.defaultProductLine}` : "";
  form.tagsText = "";
  form.title = "";
  form.trustLevel = "medium";
  formError.value = "";
};

const handleSubmit = () => {
  formError.value = "";

  if (!form.title.trim()) {
    formError.value = "知识片段标题不能为空。";
    return;
  }

  if (!form.content.trim() || form.content.trim().length < 10) {
    formError.value = "知识片段正文至少需要 10 个字符。";
    return;
  }

  emit("submit", {
    allowedDepartmentIds:
      form.materialType === "aftersales_material" ? form.allowedDepartmentIds : [],
    applicableModules: form.applicableModules,
    content: form.content.trim(),
    materialType: trimOptional(form.materialType),
    reviewStatus: props.canReview ? form.reviewStatus : "pending",
    sourceDescription: trimOptional(form.sourceDescription),
    tags: splitCommaValues(form.tagsText),
    title: form.title.trim(),
    trustLevel: form.trustLevel
  });
};
</script>

<template>
  <section class="knowledge-tab-panel">
    <div class="knowledge-tab-header">
      <div>
        <p class="section-kicker">文本导入</p>
        <h3>粘贴企业事实资料</h3>
        <p>手动录入会生成资料记录，并同步生成可被引用和编辑的知识片段。</p>
      </div>
      <el-button @click="reset">清空</el-button>
    </div>

    <el-alert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form class="knowledge-text-import-form" label-position="top">
      <el-form-item label="片段标题" required>
        <el-input v-model="form.title" placeholder="例如：项目资料摘要、FAQ、场景说明或服务边界" />
      </el-form-item>
      <el-form-item label="资料类型">
        <el-select v-model="form.materialType" placeholder="选择资料类型">
          <el-option
            v-for="option in materialTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="可用场景">
        <el-select v-model="form.applicableModules" multiple placeholder="选择可用场景">
          <el-option
            v-for="option in applicableModuleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="可靠程度">
        <el-select v-model="form.trustLevel">
          <el-option
            v-for="option in trustLevelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资料状态">
        <el-select v-model="form.reviewStatus" :disabled="!props.canReview">
          <el-option
            v-for="option in reviewStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="来源说明" class="form-span-2">
        <el-input v-model="form.sourceDescription" placeholder="例如 售后工程师整理、官网资料摘录" />
      </el-form-item>
      <el-form-item
        v-if="form.materialType === 'aftersales_material' && props.departments?.length"
        label="售后可见部门"
        class="form-span-2"
      >
        <el-select v-model="form.allowedDepartmentIds" multiple placeholder="选择可查看售后资料的部门">
          <el-option
            v-for="department in props.departments"
            :key="department.id"
            :label="department.name"
            :value="department.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="标签" class="form-span-2">
        <el-input v-model="form.tagsText" placeholder="多个标签用逗号分隔，例如 选型, 参数, FAQ" />
      </el-form-item>
      <el-form-item label="正文内容" required class="form-span-2">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="8"
          placeholder="粘贴可被 AI 引用的企业事实资料，至少 10 个字符。"
        />
      </el-form-item>
    </el-form>

    <div class="knowledge-form-actions">
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存手动资料
      </el-button>
    </div>
  </section>
</template>

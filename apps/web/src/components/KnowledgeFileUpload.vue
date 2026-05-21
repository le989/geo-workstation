<script setup lang="ts">
import { ref } from "vue";
import type { KnowledgeApplicableModule, UploadKnowledgeFileExtraFields } from "@/api/knowledge";
import type { Department } from "@/api/departments";
import { splitCommaValues } from "@/config/geo-prompt-options";
import {
  applicableModuleOptions,
  isSupportedKnowledgeFileName,
  materialTypeOptions,
  reviewStatusOptions,
  trustLevelOptions
} from "@/config/knowledge-options";

const props = defineProps<{
  uploading?: boolean;
  canReview?: boolean;
  departments?: Department[];
}>();

const emit = defineEmits<{
  upload: [payload: { file: File; extraFields: UploadKnowledgeFileExtraFields }];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const formError = ref("");
const title = ref("");
const materialType = ref("product_material");
const applicableModules = ref<KnowledgeApplicableModule[]>(["internal-search"]);
const sourceDescription = ref("");
const trustLevel = ref<UploadKnowledgeFileExtraFields["trustLevel"]>("medium");
const reviewStatus = ref<UploadKnowledgeFileExtraFields["reviewStatus"]>("pending");
const allowedDepartmentIds = ref<string[]>([]);
const tagsText = ref("");

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] ?? null;
  formError.value = "";
};

const reset = () => {
  selectedFile.value = null;
  title.value = "";
  materialType.value = "product_material";
  applicableModules.value = ["internal-search"];
  sourceDescription.value = "";
  trustLevel.value = "medium";
  reviewStatus.value = "pending";
  allowedDepartmentIds.value = [];
  tagsText.value = "";
  formError.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleSubmit = () => {
  formError.value = "";

  if (!selectedFile.value) {
    formError.value = "请先选择 txt、md、csv、Excel 或 Word 文件。";
    return;
  }

  if (!isSupportedKnowledgeFileName(selectedFile.value.name)) {
    formError.value = "当前支持 txt、md、csv、Excel 和 docx 文件。";
    return;
  }

  emit("upload", {
    extraFields: {
      allowedDepartmentIds:
        materialType.value === "aftersales_material" ? allowedDepartmentIds.value : [],
      applicableModules: applicableModules.value,
      materialType: materialType.value || "content_reference_material",
      reviewStatus: props.canReview ? reviewStatus.value : "pending",
      sourceDescription: sourceDescription.value.trim() || undefined,
      tags: splitCommaValues(tagsText.value),
      title: title.value.trim() || undefined,
      trustLevel: trustLevel.value
    },
    file: selectedFile.value
  });
};
</script>

<template>
  <section class="knowledge-file-upload">
    <div class="knowledge-tab-header">
      <div>
        <p class="section-kicker">文件导入</p>
        <h3>上传可解析资料</h3>
        <p>支持上传 txt / md / csv / Excel / Word 资料，上传后会解析为知识片段。</p>
      </div>
      <el-tag type="info" effect="plain">自动解析为知识片段</el-tag>
    </div>

    <el-alert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <div class="knowledge-upload-box">
      <!-- prettier-ignore -->
      <input
        ref="fileInput"
        class="knowledge-upload-input"
        type="file"
        accept=".txt,.md,.csv,.xlsx,.xls,.docx"
        @change="handleFileChange"
      >
      <div class="knowledge-upload-copy">
        <strong>{{ selectedFile?.name ?? "选择 txt / md / csv / Excel / Word 文件" }}</strong>
        <span>文件资料会进入企业 GEO 知识库，用于后续内容生成和 AI 可引用信息沉淀。</span>
      </div>
    </div>

    <el-form class="knowledge-file-upload-form" label-position="top">
      <el-form-item label="资料标题">
        <el-input v-model="title" placeholder="默认使用文件名" />
      </el-form-item>
      <el-form-item label="资料类型">
        <el-select v-model="materialType" placeholder="选择资料类型">
          <el-option
            v-for="option in materialTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="可用场景">
        <el-select v-model="applicableModules" multiple placeholder="选择可用场景">
          <el-option
            v-for="option in applicableModuleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="来源说明">
        <el-input v-model="sourceDescription" placeholder="例如 官网资料、售后工程师整理" />
      </el-form-item>
      <el-form-item label="可靠程度">
        <el-select v-model="trustLevel">
          <el-option
            v-for="option in trustLevelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资料状态">
        <el-select v-model="reviewStatus" :disabled="!props.canReview">
          <el-option
            v-for="option in reviewStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-if="materialType === 'aftersales_material' && props.departments?.length"
        label="售后可见部门"
        class="form-span-2"
      >
        <el-select v-model="allowedDepartmentIds" multiple placeholder="选择可查看售后资料的部门">
          <el-option
            v-for="department in props.departments"
            :key="department.id"
            :label="department.name"
            :value="department.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="标签">
        <el-input v-model="tagsText" placeholder="多个标签用逗号分隔，例如 参数, FAQ, 案例" />
      </el-form-item>
    </el-form>

    <div class="knowledge-form-actions">
      <el-button @click="reset">清空</el-button>
      <el-button type="primary" :loading="props.uploading" @click="handleSubmit">
        上传并解析
      </el-button>
    </div>
  </section>
</template>

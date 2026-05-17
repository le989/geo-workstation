<script setup lang="ts">
import { ref } from "vue";
import type { UploadKnowledgeFileExtraFields } from "@/api/knowledge";
import { splitCommaValues } from "@/config/geo-prompt-options";
import { isSupportedKnowledgeFileName, materialTypeOptions } from "@/config/knowledge-options";

const props = defineProps<{
  uploading?: boolean;
}>();

const emit = defineEmits<{
  upload: [payload: { file: File; extraFields: UploadKnowledgeFileExtraFields }];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const formError = ref("");
const materialType = ref("file_import");
const tagsText = ref("");

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] ?? null;
  formError.value = "";
};

const reset = () => {
  selectedFile.value = null;
  materialType.value = "file_import";
  tagsText.value = "";
  formError.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleSubmit = () => {
  formError.value = "";

  if (!selectedFile.value) {
    formError.value = "请先选择 txt、md 或 csv 文件。";
    return;
  }

  if (!isSupportedKnowledgeFileName(selectedFile.value.name)) {
    formError.value = "当前支持 txt、md、csv 文件，其他格式请先转为文本资料后再上传。";
    return;
  }

  emit("upload", {
    extraFields: {
      materialType: materialType.value || "file_import",
      tags: splitCommaValues(tagsText.value)
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
        <p>支持上传 txt / md / csv 资料，上传后会解析为知识片段。</p>
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
        accept=".txt,.md,.csv"
        @change="handleFileChange"
      >
      <div class="knowledge-upload-copy">
        <strong>{{ selectedFile?.name ?? "选择 txt / md / csv 文件" }}</strong>
        <span>文件资料会进入企业 GEO 知识库，用于后续内容生成和 AI 可引用信息沉淀。</span>
      </div>
    </div>

    <el-form class="knowledge-file-upload-form" label-position="top">
      <el-form-item label="资料类型">
        <el-select v-model="materialType" clearable placeholder="默认文件导入">
          <el-option
            v-for="option in materialTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
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

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { TextImportPayload } from "@/api/knowledge";
import { splitCommaValues } from "@/config/geo-prompt-options";
import { materialTypeOptions, sourceTypeOptions } from "@/config/knowledge-options";

const props = defineProps<{
  defaultProductLine?: string;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: TextImportPayload];
}>();

const formError = ref("");

const form = reactive({
  content: "",
  materialType: "product_info",
  productLine: props.defaultProductLine ?? "",
  sourceType: "pasted_text",
  tagsText: "",
  title: ""
});

watch(
  () => props.defaultProductLine,
  (value) => {
    if (value && !form.productLine) {
      form.productLine = value;
    }
  }
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const reset = () => {
  form.content = "";
  form.materialType = "product_info";
  form.productLine = props.defaultProductLine ?? "";
  form.sourceType = "pasted_text";
  form.tagsText = "";
  form.title = "";
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
    content: form.content.trim(),
    materialType: trimOptional(form.materialType),
    productLine: trimOptional(form.productLine),
    sourceType: trimOptional(form.sourceType),
    tags: splitCommaValues(form.tagsText),
    title: form.title.trim()
  });
};
</script>

<template>
  <section class="knowledge-tab-panel">
    <div class="knowledge-tab-header">
      <div>
        <p class="section-kicker">文本导入</p>
        <h3>粘贴企业事实资料</h3>
        <p>把产品参数、FAQ、应用方案或资质说明沉淀为可被 GEO 内容生成引用的知识片段。</p>
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
      <el-form-item label="来源类型">
        <el-select v-model="form.sourceType">
          <el-option
            v-for="option in sourceTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资料类型">
        <el-select v-model="form.materialType" clearable placeholder="选择资料类型">
          <el-option
            v-for="option in materialTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="默认继承当前知识库产品线" />
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
        导入为知识片段
      </el-button>
    </div>
  </section>
</template>

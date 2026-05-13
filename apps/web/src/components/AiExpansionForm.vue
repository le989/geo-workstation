<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { AiGenerateExpansionPayload } from "@/api/expansion";
import type { UserIntent } from "@/api/geo-prompts";
import { splitCommaValues, userIntentOptions } from "@/config/geo-prompt-options";
import { aiProviderOptions } from "@/config/label-maps";

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: AiGenerateExpansionPayload];
}>();

const form = reactive({
  baseWord: "",
  constraints: "",
  count: 10,
  knowledgeBaseId: "",
  model: "mock-expansion-v1",
  productLine: "",
  promptType: "distilled" as AiGenerateExpansionPayload["promptType"],
  provider: "mock" as "mock" | "openai_compatible",
  scenario: "",
  targetModelsText: "",
  userIntent: "selection" as UserIntent
});

const localError = ref("");

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

watch(
  () => form.provider,
  (provider) => {
    if (provider === "mock") {
      form.model = "mock-expansion-v1";
    } else if (!form.model || form.model === "mock-expansion-v1") {
      form.model = "deepseek-chat";
    }
  }
);

const handleSubmit = () => {
  localError.value = "";

  if (!form.baseWord.trim()) {
    localError.value = "训练词不能为空。";
    return;
  }

  if (form.count < 1 || form.count > 50) {
    localError.value = "生成数量必须在 1-50 之间。";
    return;
  }

  emit("submit", {
    baseWord: form.baseWord.trim(),
    constraints: trimOptional(form.constraints),
    count: form.count,
    knowledgeBaseId: trimOptional(form.knowledgeBaseId),
    model: trimOptional(form.model),
    productLine: trimOptional(form.productLine),
    promptType: form.promptType,
    provider: form.provider,
    scenario: trimOptional(form.scenario),
    targetModels: splitCommaValues(form.targetModelsText),
    userIntent: form.userIntent
  });
};
</script>

<template>
  <section class="expansion-form-panel">
    <div class="expansion-form-header">
      <div>
        <p class="section-kicker">AI 拓词</p>
        <h2>AI 拓词</h2>
        <p>生成用户可能会向 AI 提出的问题候选，人工筛选后再保存到提示词策略库。</p>
      </div>
      <el-tag type="warning" effect="plain">候选词不会自动入库</el-tag>
    </div>

    <el-alert
      title="默认使用模拟生成；选择真实 AI 接口会消耗接口额度，API Key 由后端 .env 管理，前端不提供密钥配置框。建议输入具体产品、服务、课程、门店或个人品牌方向，结果太泛时可补充目标客户、场景或限制条件。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="localError"
      :title="localError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form label-position="top" class="expansion-form-grid">
      <el-form-item label="训练词" required>
        <el-input
          v-model="form.baseWord"
          placeholder="例如：核心产品词、服务词、课程词或门店场景"
        />
      </el-form-item>
      <el-form-item label="输出词类型" required>
        <el-select v-model="form.promptType">
          <el-option label="蒸馏词" value="distilled" />
          <el-option label="品牌词" value="brand" />
          <el-option label="场景词" value="scene" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户意图">
        <el-select v-model="form.userIntent">
          <el-option
            v-for="option in userIntentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="生成数量">
        <el-input-number v-model="form.count" :min="1" :max="50" />
      </el-form-item>
      <el-form-item label="AI 生成方式">
        <el-select v-model="form.provider">
          <el-option
            v-for="option in aiProviderOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="模型名称">
        <el-input v-model="form.model" placeholder="默认可留空，例如 deepseek-chat" />
      </el-form-item>
      <el-form-item label="知识库 ID">
        <el-input v-model="form.knowledgeBaseId" placeholder="可选，第一版可手动输入" />
      </el-form-item>
      <el-form-item label="产品线 / 服务线">
        <el-input
          v-model="form.productLine"
          placeholder="可选，例如：核心产品、服务、课程或门店项目"
        />
      </el-form-item>
      <el-form-item label="应用场景">
        <el-input
          v-model="form.scenario"
          placeholder="可选，例如：典型使用场景、咨询场景或到店场景"
        />
      </el-form-item>
      <el-form-item label="目标模型">
        <el-input v-model="form.targetModelsText" placeholder="多个模型用逗号分隔" />
      </el-form-item>
      <el-form-item label="约束条件" class="form-span-2">
        <el-input
          v-model="form.constraints"
          type="textarea"
          :rows="4"
          placeholder="例如：不要生成价格词；优先生成家长会问的问题；围绕选型、对比、顾虑和场景展开。"
        />
      </el-form-item>
    </el-form>

    <div class="expansion-form-actions">
      <el-button type="primary" :loading="props.loading" @click="handleSubmit">
        AI 生成候选词
      </el-button>
    </div>
  </section>
</template>

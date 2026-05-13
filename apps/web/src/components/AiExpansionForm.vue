<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { AiGenerateExpansionPayload } from "@/api/expansion";
import type { UserIntent } from "@/api/geo-prompts";
import { splitCommaValues, userIntentOptions } from "@/config/geo-prompt-options";

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
    localError.value = "训练词 baseWord 不能为空。";
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
        <p class="section-kicker">AI Expansion</p>
        <h2>AI 拓词</h2>
        <p>支持 Mock 或 openai_compatible 生成偏 GEO 场景的候选问法；结果仍需人工勾选保存。</p>
      </div>
      <el-tag type="warning" effect="plain">候选词不会自动入库</el-tag>
    </div>

    <el-alert
      title="默认 provider 为 mock；选择 openai_compatible 会消耗真实 AI 接口额度，API Key 由后端 .env 管理，前端不提供密钥配置框。"
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
      <el-form-item label="训练词 baseWord" required>
        <el-input v-model="form.baseWord" placeholder="例如：激光测距传感器" />
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
      <el-form-item label="provider">
        <el-select v-model="form.provider">
          <el-option label="mock：Mock 生成" value="mock" />
          <el-option label="openai_compatible：真实 AI" value="openai_compatible" />
        </el-select>
      </el-form-item>
      <el-form-item label="model">
        <el-input v-model="form.model" placeholder="默认可留空，例如 deepseek-chat" />
      </el-form-item>
      <el-form-item label="知识库 ID">
        <el-input v-model="form.knowledgeBaseId" placeholder="可选，第一版可手动输入" />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="form.productLine" placeholder="可选，例如：工业传感器" />
      </el-form-item>
      <el-form-item label="应用场景">
        <el-input v-model="form.scenario" placeholder="可选，例如：行车防撞" />
      </el-form-item>
      <el-form-item label="目标模型">
        <el-input v-model="form.targetModelsText" placeholder="多个模型用逗号分隔" />
      </el-form-item>
      <el-form-item label="约束条件" class="form-span-2">
        <el-input
          v-model="form.constraints"
          type="textarea"
          :rows="4"
          placeholder="可选，例如：优先生成选型、厂家推荐和国产替代场景"
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

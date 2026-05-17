<script setup lang="ts">
import { reactive, ref } from "vue";
import type { GeoPromptType, UserIntent } from "@/api/geo-prompts";
import type { RuleGenerateExpansionPayload } from "@/api/expansion";
import {
  geoPromptTypeOptions,
  splitCommaValues,
  userIntentOptions
} from "@/config/geo-prompt-options";

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: RuleGenerateExpansionPayload];
}>();

const form = reactive({
  applicationSuffixesText: "",
  baseWord: "",
  prefixesText: "怎么选\n适合谁\n怎么比较",
  priority: 3,
  productLine: "",
  promptType: "distilled" as GeoPromptType,
  scenario: "",
  serviceSuffixesText: "品牌\n服务方\n替代方案",
  source: "规则拓词",
  targetModelsText: "",
  trackEnabled: false,
  userIntent: "selection" as UserIntent
});

const localError = ref("");

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const clearForm = () => {
  form.applicationSuffixesText = "";
  form.baseWord = "";
  form.prefixesText = "";
  form.priority = 3;
  form.productLine = "";
  form.promptType = "distilled";
  form.scenario = "";
  form.serviceSuffixesText = "";
  form.source = "规则拓词";
  form.targetModelsText = "";
  form.trackEnabled = false;
  form.userIntent = "selection";
  localError.value = "";
};

const handleSubmit = () => {
  localError.value = "";

  if (!form.baseWord.trim()) {
    localError.value = "训练词不能为空。";
    return;
  }

  if (form.priority < 1 || form.priority > 5) {
    localError.value = "优先级必须在 1-5 之间。";
    return;
  }

  emit("submit", {
    applicationSuffixes: splitCommaValues(form.applicationSuffixesText),
    baseWord: form.baseWord.trim(),
    prefixes: splitCommaValues(form.prefixesText),
    priority: form.priority,
    productLine: trimOptional(form.productLine),
    promptType: form.promptType,
    scenario: trimOptional(form.scenario),
    serviceSuffixes: splitCommaValues(form.serviceSuffixesText),
    source: trimOptional(form.source) ?? "规则拓词",
    targetModels: splitCommaValues(form.targetModelsText),
    trackEnabled: form.trackEnabled,
    userIntent: form.userIntent
  });
};
</script>

<template>
  <section class="expansion-form-panel">
    <div class="expansion-form-header">
      <div>
        <p class="section-kicker">规则拓词</p>
        <h2>手动组合拓词</h2>
        <p>按“前缀、训练词、品牌/服务后缀、应用后缀”生成七类 GEO 候选问法。</p>
      </div>
      <el-tag type="info" effect="plain">候选词不会直接入库</el-tag>
    </div>

    <el-alert
      v-if="localError"
      :title="localError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />
    <el-alert
      v-if="form.promptType === 'base'"
      title="训练词不建议作为拓词输出类型，通常用于输入基词。"
      type="warning"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-form label-position="top" class="expansion-form-grid">
      <div class="expansion-form-subtitle form-span-4">
        <strong>基础配置</strong>
        <span>先填写训练词、输出方向和场景信息，即可生成候选词。</span>
      </div>

      <el-form-item label="训练词" required>
        <el-input
          v-model="form.baseWord"
          placeholder="例如：核心产品词、服务词、课程词或门店场景"
        />
      </el-form-item>
      <el-form-item label="输出词类型">
        <el-select v-model="form.promptType">
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.value === 'base' ? `${option.label}（不建议）` : option.label"
            :value="option.value"
          />
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
      <el-form-item label="优先级">
        <el-input-number v-model="form.priority" :min="1" :max="5" />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input
          v-model="form.productLine"
          placeholder="可选，例如：核心产品、服务、课程或门店项目"
        />
      </el-form-item>
      <el-form-item label="应用场景">
        <el-input v-model="form.scenario" placeholder="可选，例如：行车防撞" />
      </el-form-item>
      <el-form-item label="是否追踪">
        <el-switch v-model="form.trackEnabled" active-text="追踪" inactive-text="不追踪" />
      </el-form-item>

      <el-collapse class="expansion-advanced-config form-span-4">
        <el-collapse-item title="高级配置" name="advanced">
          <div class="expansion-form-grid">
            <el-form-item label="前缀" class="form-span-2">
              <el-input
                v-model="form.prefixesText"
                type="textarea"
                :rows="4"
                placeholder="多行或逗号分隔，例如：怎么选、适合谁、怎么比较"
              />
            </el-form-item>
            <el-form-item label="品牌 / 服务后缀" class="form-span-2">
              <el-input
                v-model="form.serviceSuffixesText"
                type="textarea"
                :rows="4"
                placeholder="多行或逗号分隔，例如：品牌、服务方、替代方案"
              />
            </el-form-item>
            <el-form-item label="应用后缀" class="form-span-2">
              <el-input
                v-model="form.applicationSuffixesText"
                type="textarea"
                :rows="4"
                placeholder="多行或逗号分隔，例如：用于行车防撞、应用在仓储测距"
              />
            </el-form-item>
            <el-form-item label="目标模型" class="form-span-2">
              <el-input v-model="form.targetModelsText" placeholder="多个模型用逗号分隔" />
            </el-form-item>
            <el-form-item label="来源">
              <el-input v-model="form.source" placeholder="例如：规则拓词" />
            </el-form-item>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <div class="expansion-form-actions">
      <el-button type="primary" :loading="props.loading" @click="handleSubmit">
        生成候选词
      </el-button>
      <el-button @click="clearForm">清空</el-button>
    </div>
  </section>
</template>

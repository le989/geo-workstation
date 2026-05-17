<script setup lang="ts">
import { computed } from "vue";
import type { InstructionTemplate } from "@/api/instructions";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import {
  contentTypeLabelMap,
  formatInstructionModelName,
  formatInstructionText,
  instructionTypeLabelMap,
  truncateInstructionText,
  targetPromptTypeLabelMap
} from "@/config/instruction-options";

const props = defineProps<{
  modelValue: boolean;
  template?: InstructionTemplate | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
}>();

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const fullTemplateText = computed(() =>
  [
    props.template?.instruction,
    props.template?.outputFormat,
    props.template?.qualityRules,
    props.template?.forbiddenRules
  ]
    .filter(Boolean)
    .join("\n")
);

const textContainsAny = (keywords: string[]) =>
  keywords.some((keyword) => fullTemplateText.value.includes(keyword));

const ruleChecklist = computed(() => [
  {
    label: "品牌锚点",
    active: textContainsAny(["品牌锚点", "目标品牌", "品牌实体", "凯基特"]),
    description: "要求内容自然建立品牌、产品和场景关联。"
  },
  {
    label: "非硬广",
    active: textContainsAny(["不要强行推销", "不要写成硬广", "不要硬广", "自然提及"]),
    description: "避免把 GEO 内容写成广告页。"
  },
  {
    label: "事实边界",
    active: textContainsAny(["事实边界", "未证实", "不要虚构", "禁止虚构"]),
    description: "约束参数、认证、型号能力等硬信息。"
  },
  {
    label: "FAQ 结构",
    active: textContainsAny(["FAQ", "常见问题", "问答"]),
    description: "便于 AI 摘取问答式内容。"
  },
  {
    label: "发布平台适配",
    active: textContainsAny(["知乎", "百家号", "今日头条", "搜狐", "网易号"]),
    description: "适合发布到常见内容平台。"
  }
]);

const templateSummary = computed(() => {
  if (!props.template) {
    return [];
  }

  return [
    {
      label: "适用场景",
      value: contentTypeLabelMap[props.template.contentType] ?? props.template.contentType
    },
    {
      label: "提示词类型",
      value: props.template.targetPromptType
        ? targetPromptTypeLabelMap[props.template.targetPromptType]
        : "全部提示词"
    },
    {
      label: "适用模型",
      value: formatInstructionModelName(props.template.targetModel)
    }
  ];
});

const instructionPreview = computed(() =>
  truncateInstructionText(props.template?.instruction, 220)
);
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="720px"
    :with-header="false"
    class="instruction-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="instruction-detail">
      <div class="instruction-detail-header">
        <div class="instruction-detail-header__copy">
          <el-tag class="instruction-detail-header__tag" type="success" effect="plain">
            GEO 指令库
          </el-tag>
          <h2>{{ props.template?.name ?? "指令模板详情" }}</h2>
          <p>查看这条指令如何指导 GEO 内容生成，而不是作为普通 prompt 收藏。</p>
        </div>
        <el-button @click="close">关闭</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else-if="template">
        <section class="instruction-readable-block instruction-readable-block--summary">
          <p class="section-kicker">模板摘要</p>
          <h3>{{ template.name }}</h3>
          <p class="instruction-template-preview">{{ instructionPreview }}</p>
          <div class="instruction-summary-grid">
            <article v-for="item in templateSummary" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
            <article>
              <span>指令类型</span>
              <strong>{{ instructionTypeLabelMap[template.instructionType] ?? template.instructionType }}</strong>
            </article>
          </div>
        </section>

        <section class="instruction-readable-block">
          <p class="section-kicker">规则清单</p>
          <h3>可扫描规则</h3>
          <p class="instruction-readable-note">
            知识库提供事实资料，指令模板定义生成规则，内容生成按模板执行。
          </p>
          <div class="instruction-rule-checklist">
            <article
              v-for="rule in ruleChecklist"
              :key="rule.label"
              :class="{ 'is-active': rule.active }"
            >
              <el-tag class="instruction-rule-tag" :type="rule.active ? 'success' : 'info'" effect="plain">
                {{ rule.active ? "已包含" : "未标明" }}
              </el-tag>
              <div>
                <strong>{{ rule.label }}</strong>
                <span>{{ rule.description }}</span>
              </div>
            </article>
          </div>
        </section>

        <el-collapse class="instruction-content-collapse">
          <el-collapse-item title="完整模板内容" name="full-content">
            <div class="instruction-readable-grid">
              <div class="instruction-readable-block">
                <p class="section-kicker">指令正文</p>
                <h3>指令正文</h3>
                <pre>{{ formatInstructionText(template.instruction) }}</pre>
              </div>
              <div class="instruction-readable-block">
                <p class="section-kicker">输出格式</p>
                <h3>输出格式</h3>
                <pre>{{ formatInstructionText(template.outputFormat) }}</pre>
              </div>
              <div class="instruction-readable-block">
                <p class="section-kicker">质量要求</p>
                <h3>质量要求</h3>
                <pre>{{ formatInstructionText(template.qualityRules) }}</pre>
              </div>
              <div class="instruction-readable-block">
                <p class="section-kicker">禁用规则</p>
                <h3>禁用规则</h3>
                <pre>{{ formatInstructionText(template.forbiddenRules) }}</pre>
              </div>
            </div>
          </el-collapse-item>
          <el-collapse-item title="技术信息（默认折叠）" name="technical">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="模板 ID">{{ template.id }}</el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ formatOptional(template.createdBy) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(template.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(template.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>
        </el-collapse>
      </template>
    </section>
  </el-drawer>
</template>

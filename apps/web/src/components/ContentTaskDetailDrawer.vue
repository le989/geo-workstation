<script setup lang="ts">
import { computed } from "vue";
import type { ContentItem, ContentTaskDetail } from "@/api/content";
import ContentGenerationTypeTag from "@/components/ContentGenerationTypeTag.vue";
import ContentItemTable from "@/components/ContentItemTable.vue";
import ContentTaskStatusTag from "@/components/ContentTaskStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import { generationTypeLabelMap } from "@/config/content-options";
import { formatDateTime, formatOptional } from "@/config/geo-prompt-options";
import { contentTypeLabelMap, instructionTypeLabelMap } from "@/config/instruction-options";
import {
  aiCallPurposeLabelMap,
  aiCallStatusLabelMap,
  formatProviderModel
} from "@/config/label-maps";

const props = defineProps<{
  modelValue: boolean;
  detail?: ContentTaskDetail | null;
  loading?: boolean;
  retrying?: boolean;
  exportingIds?: string[];
  deletingIds?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  refresh: [];
  retry: [];
  view: [item: ContentItem];
  edit: [item: ContentItem];
  export: [item: ContentItem];
  delete: [item: ContentItem];
}>();

const hasFailedItems = computed(
  () => props.detail?.items.some((item) => item.status === "failed") ?? false
);
const canRetry = computed(() => props.detail?.task.status === "failed" || hasFailedItems.value);
const isRealAiTask = computed(() => props.detail?.task.provider === "openai_compatible");
const failedItemReasons = computed(
  () =>
    props.detail?.items
      .filter((item) => item.status === "failed" && item.errorMessage)
      .map((item) => item.errorMessage as string) ?? []
);
const failureAlertTitle = computed(() =>
  isRealAiTask.value
    ? "内容任务已创建，但真实 AI 生成失败，请查看失败原因。"
    : "当前任务已创建，但部分内容项生成失败，请查看失败原因。"
);
const failureAlertDescription = computed(() => {
  const firstReason = failedItemReasons.value[0];

  if (firstReason) {
    return `失败原因：${firstReason}`;
  }

  return isRealAiTask.value
    ? "请检查后端 .env 中的 AI Provider 配置、API Key、baseURL、模型名称或网络连通性，也可以切换为模拟生成。"
    : "请查看内容项状态后重试失败任务。";
});

const close = () => {
  emit("update:modelValue", false);
};
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="86%"
    :with-header="false"
    class="content-detail-drawer"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="content-detail">
      <div class="content-detail-header">
        <div>
          <el-tag type="success" effect="plain">GEO 内容任务</el-tag>
          <h2>{{ detail?.task.name ?? "GEO 内容任务详情" }}</h2>
          <p>
            查看提示词、企业知识库和指令模板如何共同生成内容资产，判断这些内容是否能支撑 AI
            回答中的品牌提及、推荐和引用。
          </p>
        </div>
        <div class="content-detail-actions">
          <el-button :loading="loading" @click="emit('refresh')">刷新详情</el-button>
          <el-button v-if="canRetry" type="warning" :loading="retrying" @click="emit('retry')">
            重试失败任务
          </el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </div>

      <el-alert
        title="重试不会重复生成已成功内容项，只会处理失败或缺失的 GEO 内容结果。"
        type="info"
        :closable="false"
        show-icon
        class="dialog-alert"
      />

      <el-skeleton v-if="loading && !detail" :rows="8" animated />

      <template v-else-if="detail">
        <el-alert
          v-if="detail.task.status === 'failed' || hasFailedItems"
          :title="failureAlertTitle"
          :description="failureAlertDescription"
          type="error"
          :closable="false"
          show-icon
          class="dialog-alert"
        />

        <el-descriptions :column="3" border class="content-detail-summary">
          <el-descriptions-item label="任务名称">
            {{ detail.task.name }}
          </el-descriptions-item>
          <el-descriptions-item label="产品线">
            {{ formatOptional(detail.task.productLine) }}
          </el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <ContentTaskStatusTag :status="detail.task.status" />
          </el-descriptions-item>
          <el-descriptions-item label="生成类型">
            <ContentGenerationTypeTag :type="detail.task.generationType" />
          </el-descriptions-item>
          <el-descriptions-item label="目标模型">
            {{ formatOptional(detail.task.targetModel) }}
          </el-descriptions-item>
          <el-descriptions-item label="AI 生成方式 / 模型">
            {{ formatProviderModel(detail.task.provider, detail.task.model) }}
          </el-descriptions-item>
          <el-descriptions-item label="知识库">
            {{ detail.knowledgeBase?.name ?? "--" }}
          </el-descriptions-item>
          <el-descriptions-item label="指令模板">
            {{ detail.instructionTemplate?.name ?? "--" }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detail.task.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="content-workflow-strip">
          <div class="content-workflow-card">
            <span>提示词</span>
            <strong>{{ detail.prompts.length }} 个</strong>
            <small>决定内容要服务的 AI 问答入口。</small>
          </div>
          <div class="content-workflow-card">
            <span>知识库</span>
            <strong>{{ detail.knowledgeBase?.name ?? "未选择" }}</strong>
            <small>约束内容事实来源，减少未经证实的参数。</small>
          </div>
          <div class="content-workflow-card">
            <span>指令模板</span>
            <strong>{{ detail.instructionTemplate?.name ?? "未选择" }}</strong>
            <small>控制文章结构、质量规则和禁止事项。</small>
          </div>
          <div class="content-workflow-card">
            <span>生成方式</span>
            <strong>{{ formatProviderModel(detail.task.provider, detail.task.model) }}</strong>
            <small>真实 AI 接口会消耗额度，失败原因会保留在内容项中。</small>
          </div>
        </section>

        <div class="content-detail-grid">
          <el-card shadow="never">
            <template #header>关联 GEO 提示词</template>
            <div v-if="detail.prompts.length > 0" class="related-list">
              <div v-for="prompt in detail.prompts" :key="prompt.id" class="related-item">
                <strong>{{ prompt.promptText }}</strong>
                <GeoPromptTypeTag :type="prompt.type" />
                <span>{{ formatOptional(prompt.productLine) }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无关联提示词" />
          </el-card>

          <el-card shadow="never">
            <template #header>知识库与指令上下文</template>
            <p>
              知识库：{{ detail.knowledgeBase?.name ?? "未选择" }} /
              {{ formatOptional(detail.knowledgeBase?.productLine) }}
            </p>
            <p>
              指令：{{ detail.instructionTemplate?.name ?? "未选择" }} /
              {{
                detail.instructionTemplate
                  ? (instructionTypeLabelMap[detail.instructionTemplate.instructionType] ??
                    detail.instructionTemplate.instructionType)
                  : "--"
              }}
            </p>
            <p>
              内容类型：{{
                detail.instructionTemplate
                  ? (contentTypeLabelMap[detail.instructionTemplate.contentType] ??
                    detail.instructionTemplate.contentType)
                  : (generationTypeLabelMap[detail.task.generationType] ??
                    detail.task.generationType)
              }}
            </p>
          </el-card>

          <el-card shadow="never">
            <template #header>AI 调用日志</template>
            <div v-if="detail.aiCallLogs.length > 0" class="related-list compact">
              <div v-for="log in detail.aiCallLogs" :key="log.id" class="related-item">
                <strong>{{ formatProviderModel(log.provider, log.model) }}</strong>
                <span>{{ aiCallPurposeLabelMap[log.purpose] ?? log.purpose }}</span>
                <el-tag :type="log.status === 'failed' ? 'danger' : 'success'" effect="plain">
                  {{ aiCallStatusLabelMap[log.status] ?? log.status }}
                </el-tag>
                <span>{{ formatDateTime(log.createdAt) }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无 AI 调用日志" />
          </el-card>
        </div>

        <section class="content-items-section">
          <div class="section-heading">
            <div>
              <p class="section-kicker">内容项</p>
              <h3>生成内容项</h3>
              <p>这些内容项服务于具体 GEO 提示词，可编辑、软删除或导出 Markdown。</p>
            </div>
          </div>
          <ContentItemTable
            :items="detail.items"
            :prompts="detail.prompts"
            :exporting-ids="exportingIds"
            :deleting-ids="deletingIds"
            @view="emit('view', $event)"
            @edit="emit('edit', $event)"
            @export="emit('export', $event)"
            @delete="emit('delete', $event)"
          />
        </section>
      </template>

      <el-empty v-else description="请选择一个内容任务查看详情" />
    </section>
  </el-drawer>
</template>

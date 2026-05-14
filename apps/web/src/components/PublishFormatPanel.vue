<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type {
  ContentItem,
  FormatContentItemForPublishPayload,
  PublishFormatResult,
  PublishFormatStyle,
  PublishOptimizationResult,
  PublishSourceType
} from "@/api/content";

type ClipboardItemConstructor = new (items: Record<string, Blob>) => ClipboardItem;

const props = defineProps<{
  items: ContentItem[];
  publishOptimizationResult?: {
    itemId: string;
    itemTitle: string;
    result: PublishOptimizationResult;
  } | null;
  publishFormatResult?: {
    itemId: string;
    itemTitle: string;
    result: PublishFormatResult;
  } | null;
  publishFormatError?: string;
  formattingIds?: string[];
}>();

const emit = defineEmits<{
  format: [item: ContentItem, payload: FormatContentItemForPublishPayload];
}>();

const selectedItemId = ref("");
const sourceType = ref<PublishSourceType>("original");
const formatStyle = ref<PublishFormatStyle>("general");
const includeGeoNotes = ref(true);
const includeWarnings = ref(true);

const styleOptions: Array<{ label: string; value: PublishFormatStyle; description: string }> = [
  {
    label: "通用发布稿",
    value: "general",
    description: "适合大多数内容平台复制粘贴。"
  },
  {
    label: "官网文章",
    value: "website",
    description: "适合官网 CMS、SEO 站或技术文章。"
  },
  {
    label: "知乎 / 百家号",
    value: "zhihu_baijiahao",
    description: "段落更短，适合问答式平台阅读。"
  },
  {
    label: "公众号草稿",
    value: "wechat",
    description: "适合粘贴到公众号编辑器后人工预览。"
  }
];

const selectedItem = computed(
  () => props.items.find((item) => item.id === selectedItemId.value) ?? props.items[0]
);
const hasOptimizedSource = computed(
  () => props.publishOptimizationResult?.itemId === selectedItem.value?.id
);
const currentItemFormatResult = computed(() =>
  props.publishFormatResult?.itemId === selectedItem.value?.id
    ? props.publishFormatResult.result
    : null
);
const isFormatting = computed(() =>
  selectedItem.value ? props.formattingIds?.includes(selectedItem.value.id) : false
);

watch(
  () => props.items,
  (items) => {
    if (!selectedItemId.value && items[0]) {
      selectedItemId.value = items[0].id;
    }
  },
  {
    immediate: true
  }
);

watch(hasOptimizedSource, (canUseOptimized) => {
  if (!canUseOptimized && sourceType.value === "optimized") {
    sourceType.value = "original";
  }
});

const handleFormat = () => {
  if (!selectedItem.value) {
    ElMessage.warning("请先选择一个内容项。");
    return;
  }

  const payload: FormatContentItemForPublishPayload = {
    sourceType: sourceType.value,
    formatStyle: formatStyle.value,
    includeGeoNotes: includeGeoNotes.value,
    includeWarnings: includeWarnings.value
  };

  if (sourceType.value === "optimized") {
    payload.optimizedTitle = props.publishOptimizationResult?.result.title;
    payload.optimizedBody = props.publishOptimizationResult?.result.body;
  }

  emit("format", selectedItem.value, payload);
};

const copyText = async (text: string, successMessage: string) => {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(successMessage);
  } catch {
    ElMessage.warning("当前浏览器不支持自动复制，请手动选中内容复制。");
  }
};

const copyRichText = async () => {
  const result = currentItemFormatResult.value;

  if (!result) {
    return;
  }

  try {
    const clipboardItemCtor = (window as Window & { ClipboardItem?: ClipboardItemConstructor })
      .ClipboardItem;

    if (navigator.clipboard && clipboardItemCtor) {
      await navigator.clipboard.write([
        new clipboardItemCtor({
          "text/html": new Blob([result.html], {
            type: "text/html"
          }),
          "text/plain": new Blob([result.plainText], {
            type: "text/plain"
          })
        })
      ]);
      ElMessage.success("富文本已复制，可粘贴到内容平台编辑器。");
      return;
    }

    await navigator.clipboard.writeText(result.plainText);
    ElMessage.warning("当前浏览器不支持富文本复制，已降级复制纯文本。");
  } catch {
    try {
      await navigator.clipboard.writeText(result.plainText);
      ElMessage.warning("富文本复制失败，已降级复制纯文本。");
    } catch {
      ElMessage.warning("当前浏览器不支持自动复制，请手动选中内容复制。");
    }
  }
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], {
    type
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadHtml = () => {
  const result = currentItemFormatResult.value;

  if (!result) {
    return;
  }

  const htmlDocument = [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${result.title}</title>`,
    "</head>",
    "<body>",
    result.html,
    "</body>",
    "</html>"
  ].join("\n");

  downloadFile(
    htmlDocument,
    `content-item-${props.publishFormatResult?.itemId ?? "publish"}.html`,
    "text/html;charset=utf-8"
  );
  ElMessage.success("HTML 已下载。");
};

const downloadMarkdown = () => {
  const result = currentItemFormatResult.value;

  if (!result) {
    return;
  }

  downloadFile(
    result.markdown,
    `content-item-${props.publishFormatResult?.itemId ?? "publish"}.md`,
    "text/markdown;charset=utf-8"
  );
  ElMessage.success("Markdown 已下载。");
};
</script>

<template>
  <el-card shadow="never" class="publish-format-card">
    <template #header>
      <div class="publish-format-header">
        <div>
          <span>发布稿排版</span>
          <strong>富文本预览与复制</strong>
        </div>
        <el-button
          type="primary"
          :loading="Boolean(isFormatting)"
          :disabled="!selectedItem"
          @click="handleFormat"
        >
          生成富文本发布稿
        </el-button>
      </div>
    </template>

    <el-alert
      title="富文本可直接粘贴到大多数内容平台编辑器，但不同平台可能会过滤部分样式，发布前仍需人工预览。"
      type="info"
      :closable="false"
      show-icon
      class="publish-format-alert"
    />

    <el-alert
      v-if="publishFormatError"
      :title="publishFormatError"
      type="error"
      :closable="false"
      show-icon
      class="publish-format-alert"
    />

    <div class="publish-format-controls">
      <el-form-item label="内容项">
        <el-select v-model="selectedItemId" placeholder="请选择内容项">
          <el-option v-for="item in items" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="稿件来源">
        <el-radio-group v-model="sourceType">
          <el-radio-button label="original">原文</el-radio-button>
          <el-radio-button label="optimized" :disabled="!hasOptimizedSource">
            发布优化版
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="发布风格">
        <el-select v-model="formatStyle">
          <el-option
            v-for="option in styleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          >
            <div class="style-option">
              <strong>{{ option.label }}</strong>
              <span>{{ option.description }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="附加提示">
        <el-checkbox v-model="includeGeoNotes">包含 GEO 发布提示</el-checkbox>
        <el-checkbox v-model="includeWarnings">包含发布前确认</el-checkbox>
      </el-form-item>
    </div>

    <div v-if="currentItemFormatResult" class="publish-format-result">
      <div class="publish-format-actions">
        <el-button type="success" @click="copyRichText">复制富文本</el-button>
        <el-button @click="copyText(currentItemFormatResult.markdown, 'Markdown 已复制。')">
          复制 Markdown
        </el-button>
        <el-button @click="copyText(currentItemFormatResult.plainText, '纯文本已复制。')">
          复制纯文本
        </el-button>
        <el-button @click="downloadHtml">下载 HTML</el-button>
        <el-button @click="downloadMarkdown">下载 Markdown</el-button>
      </div>

      <div class="copy-tips">
        <el-tag v-for="tip in currentItemFormatResult.copyTips" :key="tip" effect="plain">
          {{ tip }}
        </el-tag>
      </div>

      <div class="rich-text-preview">
        <div class="rich-text-preview__toolbar">
          <span>富文本预览</span>
          <strong>{{ currentItemFormatResult.title }}</strong>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="rich-text-preview__body" v-html="currentItemFormatResult.html" />
      </div>
    </div>

    <el-empty v-else description="暂无富文本发布稿，请先选择内容项和发布风格后生成。" />
  </el-card>
</template>

<style scoped>
.publish-format-card {
  margin-top: 16px;
}

.publish-format-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.publish-format-header div {
  display: grid;
  gap: 4px;
}

.publish-format-header span {
  color: var(--geo-text-secondary);
  font-size: 13px;
}

.publish-format-alert {
  margin-bottom: 16px;
}

.publish-format-controls {
  background: var(--geo-bg-soft);
  border: 1px solid var(--geo-border);
  border-radius: 12px;
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 16px;
  padding: 16px;
}

.publish-format-controls :deep(.el-form-item) {
  margin-bottom: 0;
}

.publish-format-controls :deep(.el-select) {
  width: 100%;
}

.style-option {
  display: grid;
  gap: 2px;
}

.style-option span {
  color: var(--geo-text-secondary);
  font-size: 12px;
}

.publish-format-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.copy-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.rich-text-preview {
  border: 1px solid var(--geo-border);
  border-radius: 14px;
  overflow: hidden;
}

.rich-text-preview__toolbar {
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid var(--geo-border);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 16px;
}

.rich-text-preview__toolbar span {
  color: var(--geo-text-secondary);
  font-size: 13px;
}

.rich-text-preview__body {
  background: #fff;
  max-height: 520px;
  overflow: auto;
  padding: 24px;
}

@media (max-width: 900px) {
  .publish-format-controls {
    grid-template-columns: 1fr;
  }
}
</style>

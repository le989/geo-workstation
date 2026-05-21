import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/api/knowledge.ts",
  "src/components/KnowledgeBaseDetailDrawer.vue",
  "src/components/KnowledgeBaseFilters.vue",
  "src/components/KnowledgeBaseFormDialog.vue",
  "src/components/KnowledgeChunkFormDialog.vue",
  "src/components/KnowledgeChunkTable.vue",
  "src/components/KnowledgeFileCards.vue",
  "src/components/KnowledgeFileTable.vue",
  "src/components/KnowledgeFileUpload.vue",
  "src/components/KnowledgeMaterialIngestWizard.vue",
  "src/components/KnowledgeParseStatusTag.vue",
  "src/components/KnowledgeTextImportForm.vue",
  "src/utils/knowledge-citation.ts",
  "src/views/KnowledgeBasesView.vue"
];

const apiRequiredSnippets = [
  "getKnowledgeBases",
  "createKnowledgeBase",
  "getKnowledgeBase",
  "updateKnowledgeBase",
  "deleteKnowledgeBase",
  "textImportKnowledge",
  "getKnowledgeChunks",
  "updateKnowledgeChunk",
  "deleteKnowledgeChunk",
  "uploadKnowledgeFile",
  "getKnowledgeFiles",
  "getKnowledgeFile",
  "reparseKnowledgeFile",
  "deleteKnowledgeFile",
  "/api/knowledge-bases",
  "/api/knowledge-chunks",
  "/api/knowledge-files",
  "FormData"
];

const pageRequiredSnippets = [
  "企业 GEO 知识库",
  "AI 应该引用哪些企业事实资料",
  "文本导入",
  "文件资料",
  "知识片段",
  "txt/md/csv",
  "新建知识库",
  "资料入库向导",
  "建议拆分",
  "上传 / 粘贴资料",
  "解析为知识片段",
  "用于内容生成",
  "资料筛选",
  "高级筛选",
  "卡片视图",
  "表格视图",
  "搜索资料标题、主题、来源说明",
  "正式可引用",
  "不正式引用",
  "没有符合条件的资料",
  "排查信息",
  "编辑资料",
  "审核 / 编辑资料",
  "保存资料属性",
  "当前正式引用状态",
  "正式引用状态由审核状态、可信度和删除状态自动推导，不能手动编辑。",
  "整理后的正文内容",
  "updateKnowledgeFileMetadata",
  "file-edit",
  "formatKnowledgeSourceDescription",
  "KnowledgeBaseDetailDrawer",
  "KnowledgeMaterialIngestWizard",
  "KnowledgeChunkTable",
  "KnowledgeFileCards",
  "reparseKnowledgeFile"
];

const knowledgeFields = [
  "name",
  "productLine",
  "description",
  "status",
  "filesCount",
  "chunksCount",
  "fileName",
  "fileType",
  "fileSize",
  "parseStatus",
  "errorMessage",
  "title",
  "content",
  "sourceType",
  "materialType",
  "materialTopic",
  "tags"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readSource = async (relativePath) => readFile(path.join(webRoot, relativePath), "utf8");

for (const file of requiredFiles) {
  await access(path.join(webRoot, file));
}

const apiSource = await readSource("src/api/knowledge.ts");
for (const snippet of apiRequiredSnippets) {
  assert(apiSource.includes(snippet), `Knowledge API wrapper missing ${snippet}`);
}

const pageSource = [
  await readSource("src/views/KnowledgeBasesView.vue"),
  await readSource("src/components/KnowledgeBaseDetailDrawer.vue"),
  await readSource("src/components/KnowledgeBaseFilters.vue"),
  await readSource("src/components/KnowledgeBaseFormDialog.vue"),
  await readSource("src/components/KnowledgeChunkFormDialog.vue"),
  await readSource("src/components/KnowledgeChunkTable.vue"),
  await readSource("src/components/KnowledgeFileCards.vue"),
  await readSource("src/components/KnowledgeFileTable.vue"),
  await readSource("src/components/KnowledgeFileUpload.vue"),
  await readSource("src/components/KnowledgeMaterialIngestWizard.vue"),
  await readSource("src/components/KnowledgeTextImportForm.vue"),
  await readSource("src/utils/knowledge-citation.ts"),
  await readSource("src/utils/knowledge-source.ts")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Knowledge bases page missing ${snippet}`);
}

for (const field of knowledgeFields) {
  assert(pageSource.includes(field), `Knowledge page missing field ${field}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("KnowledgeBasesView"),
  "Router must use KnowledgeBasesView for /knowledge-bases"
);

process.stdout.write("Phase 3E knowledge bases check passed\n");

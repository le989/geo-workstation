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
  "src/utils/knowledge-material-suggest.ts",
  "src/utils/knowledge-citation.ts",
  "src/views/KnowledgeBasesView.vue"
];

const apiRequiredSnippets = [
  "getKnowledgeBases",
  "createKnowledgeBase",
  "getKnowledgeBase",
  "getKnowledgeDirectories",
  "createKnowledgeDirectory",
  "updateKnowledgeDirectory",
  "disableKnowledgeDirectory",
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
  "/api/knowledge-directories",
  "/api/knowledge-chunks",
  "/api/knowledge-files",
  "FormData"
];

const pageRequiredSnippets = [
  "企业 GEO 知识库",
  "管理企业资料和 AI 可引用内容",
  "文本导入",
  "文件资料",
  "知识片段",
  "txt/md/csv",
  "新建知识库",
  "资料入库向导",
  "目录管理",
  "新增目录",
  "重命名",
  "停用后不再用于新资料归类，已有资料仍可查看。",
  "默认根目录",
  "上传资料",
  "手动录入",
  "待审核资料",
  "管理目录",
  "简洁视图",
  "管理视图",
  "资料状态",
  "可靠程度",
  "可用场景",
  "AI 可引用状态",
  "已启用",
  "个筛选",
  "基础信息",
  "审核与引用",
  "正文内容",
  "可被 AI 引用",
  "暂不可引用",
  "低可靠",
  "建议拆分",
  "更多筛选",
  "knowledge-workbench-summary",
  "knowledge-file-summary",
  "knowledge-compact-actions",
  "卡片视图",
  "表格视图",
  "知识库工作台",
  "知识库目录",
  "当前知识库",
  "切换知识库",
  "管理知识库",
  "暂无知识库，请先新建知识库",
  "knowledge-workbench",
  "knowledge-workbench-shell",
  "knowledge-workbench-main",
  "knowledge-manager-dialog",
  "embedded",
  "selectKnowledgeBaseForWorkspace",
  "ensureWorkspaceKnowledgeBase",
  "资料目录",
  "knowledge-directory-layout",
  "knowledge-directory-tree",
  "knowledge-directory-node",
  "is-selected-directory",
  "全部资料",
  "目录路径",
  "directoryTreeRoots",
  "selectedDirectoryId",
  "selectDirectoryNode",
  "directoryBreadcrumb",
  "paddingLeft",
  "ingestContextVersion",
  "initial-directory-id",
  "initial-directory-path",
  "initial-directory-warning",
  "context-version",
  "handleDirectoryChange",
  "上传到：",
  "保存到：",
  "当前目录已停用，请选择其他目录",
  "请先选择一个目录",
  "新建子目录",
  "最多支持 4 层目录",
  "submitQuickChildDirectory",
  "selectAfterCreate",
  "搜索资料标题、主题、来源说明",
  "所属目录",
  "没有符合条件的资料",
  "排查信息",
  "编辑资料",
  "审核 / 编辑资料",
  "保存资料属性",
  "整理后的正文内容",
  "updateKnowledgeFileMetadata",
  "getKnowledgeDirectories",
  "directoryId",
  "directoryName",
  "file-edit",
  "formatKnowledgeSourceDescription",
  "KnowledgeBaseDetailDrawer",
  "KnowledgeMaterialIngestWizard",
  "suggestKnowledgeMaterial",
  "applyMaterialSuggestion",
  "refreshMaterialSuggestion",
  "touched.materialType",
  "!touched.materialType",
  "touched.materialTopic",
  "!touched.materialTopic",
  "系统推荐，可修改",
  "系统根据文件名推荐，可修改",
  "系统根据标题和正文推荐，可修改",
  "未识别到合适类型，可手动选择",
  "KnowledgeChunkTable",
  "KnowledgeFileCards",
  "reparseKnowledgeFile"
];

const suggestRequiredSnippets = [
  "规格书",
  "技术参数",
  "datasheet",
  "说明书",
  "安装",
  "接线",
  "故障",
  "常见问题",
  "FAQ",
  "产品参数",
  "安装接线",
  "故障排查",
  "aftersales_material",
  "product_material",
  "customer_case_material",
  "company_trust_material"
];

const forbiddenRecommendationSnippets = [
  ["AI", "推荐"].join(""),
  "智能分类",
  "自动审核",
  "自动学习",
  "自动正式引用"
];

const forbiddenVerboseKnowledgeSnippets = [
  "左侧按目录组织企业事实资料，右侧直接维护当前目录下的资料文件和知识片段。",
  "上传 / 粘贴资料",
  "用于内容生成",
  "AI 应该引用哪些企业事实资料",
  "快速判断哪些资料可被售后问答 / GEO 内容引用",
  "当前仅显示这个目录下的资料；停用目录下的已有资料仍可查看。"
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
  await readSource("src/utils/knowledge-material-suggest.ts"),
  await readSource("src/utils/knowledge-citation.ts"),
  await readSource("src/utils/knowledge-source.ts")
].join("\n");

for (const snippet of pageRequiredSnippets) {
  assert(pageSource.includes(snippet), `Knowledge bases page missing ${snippet}`);
}

for (const field of knowledgeFields) {
  assert(pageSource.includes(field), `Knowledge page missing field ${field}`);
}

const suggestSource = await readSource("src/utils/knowledge-material-suggest.ts");
for (const snippet of suggestRequiredSnippets) {
  assert(suggestSource.includes(snippet), `Knowledge material suggestion missing ${snippet}`);
}

for (const snippet of forbiddenRecommendationSnippets) {
  assert(!pageSource.includes(snippet), `Knowledge recommendation should not use wording ${snippet}`);
}

for (const snippet of forbiddenVerboseKnowledgeSnippets) {
  assert(!pageSource.includes(snippet), `Knowledge page should avoid verbose wording ${snippet}`);
}

const routesSource = await readSource("src/router/routes.ts");
assert(
  routesSource.includes("KnowledgeBasesView"),
  "Router must use KnowledgeBasesView for /knowledge-bases"
);

process.stdout.write("Phase 3E knowledge bases check passed\n");

export const GEO_MODULES = [
  { key: "dashboard", label: "工作台", group: "正式模块" },
  { key: "geo-analysis", label: "GEO 诊断", group: "正式模块" },
  { key: "geo-prompts", label: "提示词库", group: "正式模块" },
  { key: "expansion", label: "AI 拓词", group: "正式模块" },
  { key: "knowledge-bases", label: "知识库", group: "正式模块" },
  { key: "instruction-templates", label: "指令库", group: "正式模块" },
  { key: "geo-content", label: "发布文章工作台", group: "正式模块" },
  { key: "model-inclusion-records", label: "AI 模型覆盖记录", group: "正式模块" },
  { key: "geo-reports", label: "GEO 报表", group: "正式模块" },
  { key: "users", label: "用户管理", group: "正式模块" },
  { key: "settings", label: "系统设置", group: "正式模块" },
  { key: "help", label: "使用教程", group: "正式模块" },
  { key: "companies", label: "公司管理", group: "设置子模块" },
  { key: "product-lines", label: "产品线管理", group: "设置子模块" },
  { key: "departments", label: "部门管理", group: "新增模块" },
  { key: "aftersales-qa", label: "售后问答", group: "新增模块" },
  { key: "feedback-center", label: "反馈中心", group: "预留模块" },
  { key: "usage-analytics", label: "用量分析", group: "预留模块" },
  { key: "operation-logs", label: "操作日志", group: "预留模块" }
] as const;

export type GeoModuleKey = (typeof GEO_MODULES)[number]["key"];

export const GEO_MODULE_KEYS = GEO_MODULES.map((module) => module.key) as GeoModuleKey[];

export const DEFAULT_UNASSIGNED_DEPARTMENT_MODULE_KEYS = [
  "dashboard",
  "help"
] as const satisfies readonly GeoModuleKey[];

export const isGeoModuleKey = (value: string): value is GeoModuleKey =>
  GEO_MODULE_KEYS.includes(value as GeoModuleKey);

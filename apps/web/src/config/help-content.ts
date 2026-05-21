export type HelpStep = {
  title: string;
  description: string;
};

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
  reminders: string[];
  pendingNotes?: string[];
};

export type VersionNote = {
  name: string;
  capabilities: string[];
  usage: string;
  notes: string;
};

export const helpNavItems = [
  { id: "quick-start", title: "快速开始" },
  { id: "zero-build", title: "从 0 搭建正式数据" },
  { id: "daily-content", title: "日常内容生产" },
  { id: "diagnosis-to-content", title: "GEO 诊断到内容补齐" },
  { id: "asset-relationship", title: "核心资产关系" },
  { id: "knowledge-governance", title: "知识库资料治理" },
  { id: "aftersales-qa", title: "售后问答" },
  { id: "usage-audit", title: "使用统计与操作日志" },
  { id: "admin-maintenance", title: "管理员维护重点" },
  { id: "archive-cleanup", title: "归档与清理规则" },
  { id: "limits", title: "当前限制与注意事项" },
  { id: "version-log", title: "版本更新记录" }
] as const;

export const quickStartSteps: HelpStep[] = [
  {
    title: "登录并确认角色",
    description:
      "平台管理员、公司管理员、运营人员和查看者看到的入口不同；查看者主要用于只读、演示和临时查看。"
  },
  {
    title: "进入 Dashboard",
    description: "从 /dashboard 查看当前公司提示词、知识库、内容任务、AI 模型覆盖和待优化事项。"
  },
  {
    title: "确认公司和产品线",
    description: "正式数据从公司管理和产品线管理开始；公司、产品线可新增、编辑、启用 / 停用。"
  },
  {
    title: "配置部门和模块权限",
    description:
      "在 /departments 新增、编辑、停用部门，配置部门能进入的模块，再在用户管理中给用户绑定一个部门。"
  },
  {
    title: "建立提示词策略库",
    description:
      "在 /geo-prompts 维护训练词、蒸馏词、品牌词和场景词，优先保存真实用户会问 AI 的问题。"
  },
  {
    title: "用 AI 拓词补候选问题",
    description: "在 /expansion 生成候选提示词，人工筛选后保存到提示词策略库，候选词不会自动入库。"
  },
  {
    title: "建立知识库",
    description:
      "在 /knowledge-bases 沉淀产品、服务、案例、资质、FAQ、解决方案等可引用事实资料，并维护资料类型、可信度和审核状态。"
  },
  {
    title: "建立指令模板",
    description: "在 /instruction-templates 维护问答、指南、对比、解决方案等 GEO 内容生成方法。"
  },
  {
    title: "创建 GEO 内容任务",
    description: "在 /geo-content 选择提示词、知识库和指令模板，生成内容草稿并人工审核。"
  },
  {
    title: "使用售后问答",
    description:
      "在 /aftersales-qa 基于已通过售后资料和产品资料回答内部售后问题，回答必须带知识库、文件和片段引用。"
  },
  {
    title: "录入覆盖并复盘",
    description:
      "在 /model-inclusion-records 录入 AI 模型覆盖记录，到 /geo-reports 复盘，并由管理员查看 /usage-analytics 与 /operation-logs。"
  }
];

export const sopSections: HelpSection[] = [
  {
    id: "zero-build",
    title: "从 0 搭建正式数据",
    summary:
      "clean 库业务数据保持 0 时，先搭公司、产品线和部门权限，再搭提示词、知识库、指令模板、内容任务、售后问答和覆盖记录。",
    steps: [
      {
        title: "确认公司",
        description:
          "平台管理员或公司管理员先在系统设置中新增或确认公司，支持新增、编辑、启用 / 停用。"
      },
      {
        title: "维护产品线",
        description:
          "为当前公司新增正式产品线，支持新增、编辑、启用 / 停用；产品线暂不支持说明字段。"
      },
      {
        title: "建立部门和模块权限",
        description:
          "先新增部门，配置模块访问权限，再给用户绑定部门；部门控制进入模块，角色控制写入权限。"
      },
      {
        title: "建立提示词策略库",
        description: "围绕产品线导入第一批正式提示词，避免先导入大量泛词。"
      },
      {
        title: "AI 拓词",
        description: "用 AI 拓词生成候选提示词，人工筛选高价值问题后保存入库。"
      },
      {
        title: "建立知识库",
        description:
          "按公司或产品线建立知识库，上传或手动录入真实资料，并设置资料类型、可信度、适用模块和审核状态。"
      },
      {
        title: "审核售后资料",
        description:
          "售后资料按需配置可见部门，审核通过后再用于售后问答；待审核和已停用资料不能作为问答依据。"
      },
      {
        title: "建立指令模板",
        description: "在指令库准备通用模板或产品线专用模板，明确结构、事实引用和禁止表达。"
      },
      {
        title: "创建内容任务",
        description: "在 GEO 内容生成中创建少量测试任务，审核内容草稿后再扩大规模。"
      },
      {
        title: "录入模型覆盖记录",
        description: "人工检测 AI 回答后录入覆盖记录，为报表提供复盘依据。"
      },
      {
        title: "查看 GEO 报表",
        description: "用 GEO 报表判断下一步补提示词、补知识库、补内容还是补覆盖记录。"
      },
      {
        title: "复盘统计和日志",
        description: "平台管理员或公司管理员查看使用统计和操作日志，复盘调用情况和关键操作。"
      }
    ],
    reminders: [
      "推荐顺序：确认公司 -> 维护产品线 -> 建部门 -> 配置模块权限 -> 绑定用户部门 -> 建提示词 -> AI 拓词 -> 建知识库 -> 审核资料 -> 建指令模板 -> 创建内容任务 -> 使用售后问答 -> 录入模型覆盖记录 -> 查看报表。",
      "基础 seed 与演示 seed 已分离，clean 库从 0 搭建时不要写入演示 GEO 业务数据。",
      "不要在 clean 库上运行会写入的 API 测试。"
    ]
  },
  {
    id: "daily-content",
    title: "日常内容生产",
    summary:
      "运营人员日常从 Dashboard 判断缺口，围绕高优先级提示词创建 GEO 内容任务，再审核、导出和复盘。",
    steps: [
      {
        title: "从 Dashboard 看缺口",
        description: "先看提示词、知识库、内容任务和 AI 模型覆盖是否有明显短板。"
      },
      {
        title: "选择高优先级提示词",
        description: "在提示词策略库中选择最值得覆盖的需求决策、问题诊断、对比替代或信任验证问题。"
      },
      {
        title: "确认知识库资料",
        description: "检查关联产品线是否有足够已整理、可信、可审核的事实资料支撑内容生成。"
      },
      {
        title: "选择指令模板",
        description: "根据内容目标选择问答、指南、对比、解决方案或 FAQ 类型模板。"
      },
      {
        title: "创建 GEO 内容任务",
        description: "使用 /geo-content 创建内容任务；/content-tasks 仅作为兼容入口。"
      },
      {
        title: "审核和导出草稿",
        description: "查看、编辑、质量检查、生成发布优化版或富文本发布稿，再人工复制到发布平台。"
      },
      {
        title: "记录效果",
        description: "发布或人工检测后，进入 AI 模型覆盖记录维护提及、推荐和引用情况。"
      }
    ],
    reminders: [
      "不建议一次生成太多篇，先保证每篇能审核、能发布、能复盘。",
      "参数、认证、价格、效果承诺必须有依据。",
      "/geo-content 是 GEO 内容生成正式入口。"
    ]
  },
  {
    id: "diagnosis-to-content",
    title: "GEO 诊断到内容补齐",
    summary:
      "GEO 诊断用于前期发现提示词、知识库和内容缺口，诊断后的动作要回到资产和内容模块中处理。",
    steps: [
      {
        title: "创建 GEO 诊断任务",
        description: "在 /geo-analysis 填写品牌、官网、产品线和关键词，生成诊断结果。"
      },
      {
        title: "转入提示词策略库",
        description: "把可用的提示词建议转入 /geo-prompts，形成可追踪资产。"
      },
      {
        title: "补知识库缺口",
        description:
          "对缺资料的产品线，进入 /knowledge-bases 补产品、FAQ、案例、资质或解决方案资料。"
      },
      {
        title: "创建内容任务",
        description: "对缺内容的提示词，进入 /geo-content 创建内容任务。"
      },
      {
        title: "归档诊断任务",
        description: "阶段用途完成后可归档 GEO 诊断任务，归档后默认列表隐藏但历史结果保留。"
      }
    ],
    reminders: [
      "GEO 诊断任务可归档。",
      "归档不是物理删除，历史结果仍保留。",
      "进行中的任务不要随意归档。"
    ]
  },
  {
    id: "asset-relationship",
    title: "核心资产关系",
    summary:
      "公司和产品线是基础；提示词定义用户问题；知识库提供事实；指令库定义方法；内容任务形成草稿；覆盖记录和报表用于复盘。",
    steps: [
      {
        title: "部门和角色",
        description: "部门控制能否进入模块，角色控制写入权限；查看者仍然只读。"
      },
      {
        title: "公司 / 产品线",
        description: "决定业务数据归属和报表观察范围，是从 0 搭建正式数据的第一步。"
      },
      {
        title: "提示词策略库",
        description: "沉淀用户会向 AI 提问的问题，决定要追踪什么、生产什么内容。"
      },
      {
        title: "AI 拓词",
        description: "生成候选问题，人工选择后进入提示词策略库。"
      },
      {
        title: "知识库",
        description:
          "作为事实底座，支撑内容生成、售后问答和质量检查；资料需维护类型、审核状态和可信度。"
      },
      {
        title: "指令库",
        description: "沉淀可复用的 GEO 内容生成方法，不替代事实资料。"
      },
      {
        title: "GEO 内容生成",
        description: "把提示词、知识库和指令模板串起来，生成可审核内容草稿。"
      },
      {
        title: "售后问答",
        description: "面向内部人员，基于已通过售后资料和产品资料回答问题，并展示引用来源。"
      },
      {
        title: "使用统计 / 操作日志",
        description: "帮助管理员复盘 AI 调用、mock 使用、关键操作和异常排查。"
      },
      {
        title: "AI 模型覆盖记录 / GEO 报表",
        description: "记录模型表现并复盘下一步优化方向。"
      }
    ],
    reminders: [
      "知识库是事实底座。",
      "项目档案只提供品牌和语气上下文，事实仍以知识库为准。",
      "提示词、内容任务、售后问答和报表都应围绕公司、产品线和资料依据维护。"
    ]
  },
  {
    id: "knowledge-governance",
    title: "知识库资料治理",
    summary:
      "知识库不只是文件库。资料入库时需要区分目录、资料类型、资料主题、适用模块和审核状态，售后资料还可以限制可见部门。",
    steps: [
      {
        title: "轻量入库",
        description:
          "新增资料默认只需填写标题、资料类型、所属目录和正文内容，或选择文件、资料类型和所属目录。"
      },
      {
        title: "展开高级资料属性",
        description:
          "需要细分主题、调整适用模块、审核状态、可信度、来源说明或售后可见部门时，再展开高级资料属性。"
      },
      {
        title: "选择资料类型",
        description:
          "资料类型包括产品资料、售后资料、公司可信信息、内容引用资料、内部制度 / 流程资料和客户案例资料。"
      },
      {
        title: "选择资料主题",
        description:
          "公司新闻、活动资讯、资质证书、培训资料、行业动态、故障排查、安装接线等放在资料主题中，不新增为资料类型。"
      },
      {
        title: "设置审核状态",
        description: "新上传或手动录入资料可标为待审核、已通过或已停用；售后问答只使用已通过资料。"
      },
      {
        title: "维护可信度和适用模块",
        description: "按资料来源设置高、中、低可信度，并选择内部检索、GEO 内容生成、售后问答或 GEO 分析等适用模块。"
      },
      {
        title: "配置售后资料可见部门",
        description: "售后资料可以限制可见部门；普通用户只有在所属部门启用且被允许时才能访问。"
      },
      {
        title: "上传或手动录入",
        description: "支持 TXT、Markdown、CSV、Excel 和 Word；手动录入会生成资料记录和片段。"
      },
      {
        title: "编辑片段",
        description: "上传或录入后可编辑单个片段内容，让标题、正文和资料类型更清楚。"
      }
    ],
    reminders: [
      "PDF / OCR 后置，当前不要写成已支持能力。",
      "本地 storagePath 不对前端展示。",
      "待审核和已停用资料不能作为售后问答依据。",
      "低可信资料只用于内部查询；统一 AI 引用规则后续单独收口。"
    ]
  },
  {
    id: "aftersales-qa",
    title: "售后问答",
    summary:
      "售后问答仅供内部使用，当前为对话式售后知识助手；左侧查看历史会话，右侧连续提问，有依据就显示引用，无依据就提示补资料或转人工确认。",
    steps: [
      {
        title: "准备已通过资料",
        description: "先在知识库中录入售后资料或产品资料，并确认审核状态为已通过。"
      },
      {
        title: "配置售后资料部门",
        description: "售后资料按需配置可见部门；无权限或部门停用的普通用户不能读取。"
      },
      {
        title: "新建或继续会话",
        description:
          "在 /aftersales-qa 新建会话或选择左侧历史会话；第一条问题会自动生成标题，也可以手动重命名。"
      },
      {
        title: "管理历史会话",
        description:
          "左侧支持搜索会话标题、进行中 / 已归档 / 全部筛选、加载更多；管理员可切换我的会话和全部会话。"
      },
      {
        title: "归档和恢复",
        description:
          "不再需要的会话可以归档，不做物理删除；已归档会话默认只读，恢复后可继续提问。"
      },
      {
        title: "内部提问",
        description:
          "在右侧对话窗口输入售后问题，系统优先查售后资料，没有命中时再用产品资料兜底；连续追问只合并上一轮问题和当前问题检索。"
      },
      {
        title: "查看引用来源",
        description: "引用来源会显示知识库、文件、片段、资料类型和片段摘要。"
      },
      {
        title: "处理无依据回答",
        description:
          "如果提示“未找到可引用资料，建议补充资料或转人工确认。”，不要把它当作确定答案；问题过于模糊时需补充型号、现场现象、输出方式或接线情况。"
      },
      {
        title: "查看使用引导",
        description:
          "询问怎么补充资料、怎么转人工或售后问答怎么用时，系统会返回简短使用引导，不生成虚假引用来源。"
      },
      {
        title: "查看历史会话",
        description: "运营人员和查看者只能看自己的会话和记录，管理员可以看本公司全部会话和记录。"
      }
    ],
    reminders: [
      "售后问答不是客户开放版。",
      "不能当万能聊天机器人使用。",
      "第一阶段不做物理删除、流式输出、回答纠错、反馈待处理、转知识库草稿、Markdown 导出和图片/文件提问。",
      "不会引用公司可信信息、内容引用资料、内部制度 / 流程资料或客户案例资料作为售后答案依据。"
    ]
  },
  {
    id: "usage-audit",
    title: "使用统计与操作日志",
    summary:
      "使用统计和操作日志面向平台管理员、公司管理员，用于查看调用规模、mock 使用和关键操作，不做额度限制或成本扣费。",
    steps: [
      {
        title: "查看使用统计",
        description: "在 /usage-analytics 查看总量、用户、部门、模块和时间趋势；mock / stub 调用 token 记为 0。"
      },
      {
        title: "查看操作日志",
        description:
          "在 /operation-logs 查询登录、部门、知识库、内容生成、拓词、模型覆盖、报表导出和售后问答等关键动作。"
      },
      {
        title: "按条件筛选",
        description: "按模块、动作、用户、部门、时间和成功 / 失败筛选，定位问题来源。"
      },
      {
        title: "保护敏感信息",
        description:
          "日志不记录密码、JWT、API Key、数据库连接串、本地路径、完整 prompt 或完整 AI 原文。"
      }
    ],
    reminders: [
      "第一版只给平台管理员和公司管理员查看全局统计与日志。",
      "第一版不做 token 额度限制，也不做成本扣费。",
      "统计和日志用于审计与排查，不替代业务审核。"
    ]
  },
  {
    id: "admin-maintenance",
    title: "管理员维护重点",
    summary:
      "平台管理员维护全局账号和公司基础；公司管理员维护当前公司内业务数据；运营人员负责日常资产和内容。",
    steps: [
      {
        title: "平台管理员",
        description: "管理用户、公司、系统设置和全局能力，负责新增用户、重置密码、启用 / 禁用账号。"
      },
      {
        title: "公司管理员",
        description:
          "管理当前公司内业务数据，确认公司、产品线、提示词、知识库、指令库和内容任务可用。"
      },
      {
        title: "运营人员",
        description:
          "日常维护提示词、知识库、售后问答、指令模板、GEO 内容任务、AI 模型覆盖记录和报表复盘。"
      },
      {
        title: "查看者",
        description: "主要用于只读、演示和临时查看，不参与日常维护。"
      },
      {
        title: "部门管理",
        description:
          "支持部门新增、编辑、停用和模块访问权限配置；平台管理员和公司管理员不会被部门权限锁死。"
      },
      {
        title: "公司管理",
        description: "支持新增、编辑、启用 / 停用，不建议物理删除。"
      },
      {
        title: "产品线管理",
        description: "支持新增、编辑、启用 / 停用，当前暂不支持说明字段。"
      }
    ],
    reminders: [
      "用户建议禁用，不建议物理删除。",
      "公司 / 产品线建议启用或停用，不建议物理删除。",
      "查看者不是核心日常角色，且仍然只读。"
    ]
  },
  {
    id: "archive-cleanup",
    title: "归档与清理规则",
    summary: "归档和软删除用于让默认列表更清楚，同时保留必要历史痕迹。",
    steps: [
      {
        title: "GEO 诊断任务",
        description: "可归档，适合清理已完成、已复盘或不再关注的诊断任务。"
      },
      {
        title: "GEO 内容任务",
        description: "可归档，适合清理已完成、已处理或不再继续执行的内容任务。"
      },
      {
        title: "提示词",
        description: "可软删除，适合处理重复、无效、过期或误导性提示词。"
      },
      {
        title: "知识库 / 文件 / 片段",
        description:
          "可软删除，适合处理错误、过期、测试或不应再引用的资料；资料也可以通过审核状态停用。"
      },
      {
        title: "指令模板",
        description: "可软删除，适合处理过期或不再使用的模板。"
      },
      {
        title: "用户 / 公司 / 产品线",
        description: "用户建议禁用；公司和产品线建议启用 / 停用，不建议物理删除。"
      }
    ],
    reminders: [
      "归档不是物理删除。",
      "软删除后默认列表会更干净，但历史数据仍可按系统规则保留。",
      "进行中的 GEO 诊断任务和 GEO 内容任务不要随意归档。"
    ]
  },
  {
    id: "limits",
    title: "当前限制与注意事项",
    summary: "以下是当前版本需要诚实说明的边界，适合演示、交接和日常使用前统一口径。",
    steps: [
      {
        title: "AI 模型覆盖记录",
        description: "当前暂不支持编辑 / 作废，录入或导入前请先确认数据准确。"
      },
      {
        title: "AI 拓词历史",
        description: "历史清理后置，当前重点是把高价值候选词保存到提示词策略库。"
      },
      {
        title: "产品线说明字段",
        description: "产品线暂不支持说明字段，详细说明可先写入项目档案或知识库。"
      },
      {
        title: "真实 AI Provider",
        description: "需要单独配置；普通用户教程不写 API Key、token 或部署细节。"
      },
      {
        title: "售后问答",
        description: "当前只面向内部人员，不做客户开放版，不做自由聊天机器人，也不做自动纠错写入知识库。"
      },
      {
        title: "资料解析和额度",
        description: "PDF / OCR、token 额度限制和成本扣费属于后续能力。"
      },
      {
        title: "权限管理边界",
        description: "company_admin 暂不支持管理本公司用户；查看统计和日志仅限管理员。"
      },
      {
        title: "clean 库",
        description: "用于从 0 搭建正式数据，不要运行会写入的 API 测试，也不要写入演示 seed 数据。"
      },
      {
        title: "自动能力",
        description: "当前不做自动发布；外部 AI 自动检测属于后续能力。"
      }
    ],
    reminders: [
      "不要在教程、截图或交接文档中写真实密码、token、Cookie、API Key、完整数据库连接串、真实服务器地址或真实内网 IP。",
      "查看者主要用于只读 / 演示。",
      "如需发布记录细节，可先用外部表格记录。"
    ],
    pendingNotes: [
      "后续能力：AI 拓词历史清理。",
      "后续能力：AI 模型覆盖记录编辑 / 作废。",
      "后续能力：外部 AI 自动检测和发布记录模块。",
      "后续能力：客户开放版售后问答、反馈中心、PDF / OCR、token 额度限制。"
    ]
  }
];

export const versionNotes: VersionNote[] = [
  {
    name: "当前正式入口",
    capabilities: [
      "GEO 内容生成正式入口为 /geo-content，GEO 报表正式入口为 /geo-reports，/content-tasks 和 /reports 仅作为兼容入口。"
    ],
    usage: "用于日常演示、培训和交接时统一入口口径。",
    notes: "教程不再把兼容路由作为主入口。"
  },
  {
    name: "基础管理能力",
    capabilities: [
      "公司管理支持新增、编辑、启用 / 停用；产品线管理支持新增、编辑、启用 / 停用；部门管理支持新增、编辑、停用和模块访问权限配置；用户管理支持角色、状态和部门绑定维护。"
    ],
    usage: "适合从 clean 库搭建正式公司、产品线、部门和账号权限。",
    notes: "部门控制模块进入，角色控制写入权限；company_admin 暂不支持管理本公司用户。"
  },
  {
    name: "知识库资料治理",
    capabilities: [
      "知识库资料支持轻量入库、高级资料属性折叠、资料类型、资料主题、审核状态、可信度、适用模块、售后资料可见部门、文件上传、手动录入和片段编辑。"
    ],
    usage: "适合把企业资料从普通文件库升级为可引用、可审核、可用于售后问答的事实底座。",
    notes: "资料主题用于承载公司新闻、活动资讯、资质证书、培训资料、行业动态等细分内容；支持 TXT、Markdown、CSV、Excel、Word；PDF / OCR 后置。"
  },
  {
    name: "售后问答",
    capabilities: [
      "售后问答以左侧历史会话和右侧对话窗口承载，支持会话搜索、归档/恢复和加载更多；基于已通过售后资料优先回答，未命中时用已通过产品资料兜底，并显示知识库、文件、片段和资料类型引用。"
    ],
    usage: "适合内部售后人员连续追问已有资料依据，无法找到可靠依据时提示补资料或转人工确认。",
    notes: "不是客户开放版，不是万能聊天机器人；运营人员和查看者只能看自己的会话和问答记录。"
  },
  {
    name: "使用统计与操作日志",
    capabilities: [
      "使用统计展示 AI / mock / stub 调用总量、用户、部门、模块和趋势；操作日志记录关键业务动作摘要。"
    ],
    usage: "适合平台管理员和公司管理员做审计、复盘和问题排查。",
    notes: "mock / stub token 记为 0；第一版不做额度限制和成本扣费，不记录敏感信息。"
  },
  {
    name: "任务归档能力",
    capabilities: ["GEO 诊断任务和 GEO 内容任务支持归档，归档后默认列表隐藏，历史记录保留。"],
    usage: "适合清理已复盘、已处理或不再继续执行的历史任务。",
    notes: "归档不是物理删除，进行中的任务不要随意归档。"
  },
  {
    name: "数据初始化口径",
    capabilities: [
      "基础 seed 与演示 seed 已分离，clean 库从 0 搭建正式数据时不写入演示 GEO 业务数据。"
    ],
    usage: "适合正式库、干净库和演示库分开管理。",
    notes: "不要在 clean 库上运行会写入的 API 测试。"
  }
];

export type HelpStep = {
  title: string;
  description: string;
};

export type HelpSection = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  steps: HelpStep[];
  reminders: string[];
  pendingNotes?: string[];
};

export const helpNavItems = [
  { id: "quick-start", title: "新手快速开始" },
  { id: "daily-geo-loop", title: "日常 GEO 运营流程" },
  { id: "module-guide", title: "核心模块使用说明" },
  { id: "risk-boundaries", title: "高风险操作提醒" },
  { id: "faq", title: "常见问题" },
  { id: "glossary", title: "术语说明" },
  { id: "admin-settings", title: "管理员设置说明" }
] as const;

export const quickStartSteps: HelpStep[] = [
  {
    title: "登录并进入 Dashboard",
    description:
      "登录后先查看 /dashboard。这里是 AI 可见度驾驶舱，用来判断品牌是否被推荐、哪些模型没推荐，以及下一步补问法、证据、文章还是复盘模型。"
  },
  {
    title: "先看待处理事项",
    description:
      "优先处理待补检测词、待审核资料、待优化内容和售后反馈，不要一上来就批量生成发布稿。"
  },
  {
    title: "补齐提示词和知识库",
    description:
      "如果缺少用户会问的问题，先去提示词策略库或 AI 拓词；如果缺少事实依据，先去企业知识库补资料。"
  },
  {
    title: "用发布文章工作台生成发布稿",
    description:
      "在 /geo-content 选择资料、提示词和指令模板，生成发布稿后先检查事实、引用、风险词和排版。"
  },
  {
    title: "人工复核并手动发布",
    description:
      "AI 结果只能作为草稿，必须人工确认事实和表达；系统当前不自动发布到外部平台。"
  },
  {
    title: "记录模型覆盖并看报表",
    description:
      "发布或人工检测后，在模型覆盖记录中维护提及、推荐和官网引用情况，再到 GEO 报表复盘下一步补什么。"
  }
];

export const sopSections: HelpSection[] = [
  {
    id: "daily-geo-loop",
    kicker: "Workflow",
    title: "日常 GEO 运营流程",
    summary:
      "日常工作围绕诊断、拓词、补资料、生成发布稿、人工发布、记录覆盖和报表复盘形成闭环。",
    steps: [
      {
        title: "GEO 诊断",
        description:
          "在 /geo-analysis 输入品牌、官网、产品线或关键词，判断 AI 回答中的品牌提及、推荐和引用缺口。"
      },
      {
        title: "AI 拓词",
        description:
          "在 /expansion 区分规则拓词和 AI 拓词。规则拓词适合快速组合方向词，AI 拓词可能调用真实 Provider。"
      },
      {
        title: "补充企业知识库",
        description:
          "在 /knowledge-bases 上传或手动录入产品、FAQ、案例、资质和售后资料，并维护资料状态、可靠程度和 AI 可引用状态。"
      },
      {
        title: "维护提示词和指令模板",
        description:
          "在 /geo-prompts 保存高价值问题，在 /instruction-templates 维护问答、指南、对比和解决方案类写作方法。"
      },
      {
        title: "生成发布稿",
        description:
          "进入发布文章工作台，选择资料和指令后生成发布稿；发布检查通过后再复制富文本或其他格式。"
      },
      {
        title: "人工发布",
        description:
          "当前系统不自动发布文章。运营人员需要把复核后的发布稿手动发布到官网、公众号、B2B 页面或销售资料中。"
      },
      {
        title: "覆盖记录和报表复盘",
        description:
          "在 /model-inclusion-records 记录 AI 平台中的提及、推荐和引用结果，再到 /geo-reports 看趋势和优化建议。"
      }
    ],
    reminders: [
      "不要把 AI 草稿直接当成最终稿。",
      "没有知识库事实支撑的参数、案例、认证和效果承诺必须删除或补证据。",
      "先做少量高价值问题，确认能复盘后再扩大规模。"
    ]
  },
  {
    id: "module-guide",
    kicker: "Modules",
    title: "核心模块使用说明",
    summary: "以下模块名称按当前页面口径整理，培训和交接时优先使用这些名称。",
    steps: [
      {
        title: "Dashboard",
        description:
          "AI 可见度驾驶舱，用指标卡、趋势图、模型对比、原因分布和动作清单判断下一步 GEO 运营重点。"
      },
      {
        title: "GEO 诊断",
        description:
          "用于发现品牌、官网和产品线在 AI 回答中的可见度问题，并把建议回流到提示词、知识库和发布文章工作台。"
      },
      {
        title: "提示词策略库",
        description:
          "维护训练词、蒸馏词、品牌词、场景词和真实用户会问 AI 的问题，是内容和覆盖记录的追踪基础。"
      },
      {
        title: "AI 拓词",
        description:
          "支持规则拓词和 AI 拓词。生成结果先进入候选词列表，人工确认后才保存到提示词策略库。"
      },
      {
        title: "企业知识库",
        description:
          "企业事实底座，承载产品、服务、案例、资质、FAQ、解决方案和售后资料，并区分可靠程度和可引用状态。"
      },
      {
        title: "指令库",
        description:
          "沉淀可复用的发布稿生成方法，例如问答、指南、对比、解决方案和 FAQ 结构。"
      },
      {
        title: "发布文章工作台",
        description:
          "正式入口是 /geo-content。用于选择资料、生成发布稿、查看发布检查、复制富文本，并交给人工发布。"
      },
      {
        title: "模型覆盖记录",
        description:
          "记录豆包、通义、Kimi、DeepSeek 等平台中的品牌提及、推荐、官网引用、竞品出现和原始回答。"
      },
      {
        title: "GEO 报表",
        description:
          "复盘提示词、知识库、发布稿、模型覆盖和优化建议，决定下一阶段补词、补资料还是补内容。"
      },
      {
        title: "售后 AI 问答",
        description:
          "内部售后知识助手，只基于已审核售后资料和产品资料辅助回答，并尽量展示引用来源。"
      },
      {
        title: "用户管理 / 部门管理",
        description:
          "用户管理处理账号、角色、状态和密码重置；部门管理处理模块访问权限和知识库访问边界。"
      },
      {
        title: "系统设置",
        description:
          "维护公司、产品线、项目档案和 Provider 状态说明。设置保存会影响数据归属和运行边界，需谨慎操作。"
      }
    ],
    reminders: [
      "帮助页不再把旧名称作为主名称。",
      "/content-tasks 和 /reports 只作为历史兼容入口理解。",
      "普通员工培训时优先讲当前导航中的页面名称。"
    ]
  },
  {
    id: "risk-boundaries",
    kicker: "Safety",
    title: "高风险操作提醒",
    summary:
      "以下动作可能调用真实 Provider、写入业务数据或改变权限，操作前必须确认当前环境、公司和数据范围。",
    steps: [
      {
        title: "真实 AI 调用",
        description:
          "AI 拓词、发布稿生成、发布检查、联网检测和售后问答都可能由后端配置决定是否调用真实 Provider。"
      },
      {
        title: "候选词保存",
        description: "候选词不会自动入库；点击保存后才会写入提示词策略库。保存前要确认词意、分类和适用场景。"
      },
      {
        title: "知识库上传 / 删除 / 审核",
        description:
          "上传、手动录入、删除、停用和审核会影响后续引用范围。资料默认不等于可被 AI 正式引用。"
      },
      {
        title: "发布稿生成",
        description:
          "生成发布稿会产生内容资产，但不等于已经发布。发布前必须人工复核事实、风险词和引用依据。"
      },
      {
        title: "售后问答反馈处理",
        description:
          "反馈处理、标记状态、转知识库草稿都会写入数据。转出的草稿仍需审核，不能直接变成正式引用。"
      },
      {
        title: "用户启停 / 重置密码",
        description:
          "用户状态、角色、部门绑定和密码重置会影响账号访问能力，必须确认对象和公司范围。"
      },
      {
        title: "部门权限配置",
        description:
          "部门模块权限和知识库访问权限会影响员工能进入哪些模块、能看到哪些资料。"
      },
      {
        title: "系统设置保存",
        description:
          "公司、产品线、项目档案和系统说明类配置会影响后续资料归属、发布稿上下文和页面展示。"
      },
      {
        title: "Provider 配置",
        description:
          "Provider 密钥由后端环境变量管理，前端不展示完整密钥；是否真实调用取决于后端当前配置。"
      }
    ],
    reminders: [
      "不确定当前环境时，先停下来确认。",
      "不要为了截图或演示制造业务数据。",
      "不要把 AI 草稿、售后回答或模型检测结果当成无需复核的事实。"
    ]
  },
  {
    id: "faq",
    kicker: "FAQ",
    title: "常见问题",
    summary: "这些问题适合新员工培训、日常使用前确认，也适合管理员做交接说明。",
    steps: [
      {
        title: "为什么 Dashboard 里有示例或空数据？",
        description:
          "Dashboard 会优先展示当前公司数据；趋势图、模型对比、原因分布和标签云里的测试示例只用于本地走查，不能当成真实线上 GEO 结果。"
      },
      {
        title: "本地测试版推荐怎么走一遍闭环？",
        description:
          "建议按问法库、知识库、发布文章、模型覆盖、未推荐原因复盘、补充内容的顺序走查；只看清楚链路，不为了演示制造无意义数据。"
      },
      {
        title: "为什么 AI 拓词可能消耗额度？",
        description:
          "规则拓词通常是本地组合，AI 拓词是否调用真实 Provider 取决于后端配置。点击生成前要确认环境和模型配置。"
      },
      {
        title: "候选词保存后去了哪里？",
        description:
          "保存后的候选词进入提示词策略库，成为后续诊断、发布稿生成和模型覆盖记录的可追踪资产。"
      },
      {
        title: "发布文章是不是自动发布？",
        description:
          "不是。发布文章工作台只生成和整理发布稿，外部平台发布仍由人工完成。"
      },
      {
        title: "售后问答为什么要求引用来源？",
        description:
          "售后回答必须尽量基于已审核资料，引用来源帮助员工判断答案依据。不确定时应转人工确认。"
      },
      {
        title: "为什么知识库资料要审核和标记 AI 可引用？",
        description:
          "资料状态、可靠程度和 AI 可引用状态决定它能不能进入正式回答或发布稿，避免低可靠资料被错误引用。"
      },
      {
        title: "Provider 密钥在哪里配置？",
        description:
          "密钥由后端环境变量管理，前端只展示状态和边界说明，不展示完整 API Key、Token 或 Secret。"
      },
      {
        title: "为什么设置页不能随便保存？",
        description:
          "设置页会影响公司、产品线、项目档案和 Provider 状态说明，保存前要确认当前公司和数据范围。"
      }
    ],
    reminders: [
      "帮助页只说明当前已经存在的能力。",
      "不确定功能是否存在时，按保守口径表达。",
      "不要在帮助文档中写真实账号、密码、密钥或完整数据库连接串。"
    ]
  },
  {
    id: "glossary",
    kicker: "Glossary",
    title: "术语说明",
    summary: "统一术语能减少交接误差，也能避免把 GEO 工作站误讲成普通内容管理系统。",
    steps: [
      {
        title: "GEO 诊断",
        description: "检查品牌、官网、产品线或关键词在 AI 回答中的提及、推荐、引用和缺口。"
      },
      {
        title: "提示词策略库",
        description: "沉淀用户会如何向 AI 提问的问题，并维护词类型、产品线、优先级和状态。"
      },
      {
        title: "AI 拓词",
        description: "通过规则组合或 AI 生成候选问题，候选词需要人工确认后保存。"
      },
      {
        title: "企业知识库",
        description: "承载企业事实资料，是发布稿、售后问答和 GEO 分析的事实来源。"
      },
      {
        title: "发布文章工作台",
        description: "把提示词、知识库和指令模板串起来，生成可复核、可复制、可人工发布的发布稿。"
      },
      {
        title: "模型覆盖记录",
        description: "记录不同 AI 平台和入口下品牌是否被提及、推荐、引用官网，以及竞品是否出现。"
      },
      {
        title: "GEO 报表",
        description: "把提示词、知识库、发布稿、模型覆盖和优化建议汇总为复盘视图。"
      },
      {
        title: "售后 AI 问答",
        description: "内部售后知识助手，基于已审核资料辅助回答，不是客户开放版聊天机器人。"
      },
      {
        title: "AI 可引用状态",
        description: "资料是否适合进入正式发布稿或问答引用范围，需要结合资料状态和可靠程度判断。"
      },
      {
        title: "可靠程度 / 资料状态",
        description: "可靠程度表示资料可信度，资料状态表示待审核、已通过或已停用等使用边界。"
      },
      {
        title: "Provider",
        description: "后端配置的 AI 服务提供方。前端不保存也不展示完整密钥。"
      }
    ],
    reminders: [
      "对外发布前优先使用当前术语。",
      "历史文档中的旧称只作为兼容背景，不作为培训主名称。",
      "术语说明不替代页面操作权限。"
    ]
  },
  {
    id: "admin-settings",
    kicker: "Admin",
    title: "管理员设置说明",
    summary:
      "管理员负责公司、产品线、项目档案、用户、部门和 Provider 状态说明，所有写入动作都要确认环境和数据范围。",
    steps: [
      {
        title: "公司",
        description:
          "公司决定数据归属。新增、编辑、停用或启用公司前，要确认是否在当前 smoke 环境和正确公司范围内。"
      },
      {
        title: "产品线",
        description:
          "产品线影响提示词、知识库、发布稿和报表归类。产品线说明用于补充用途、场景和内部识别信息。"
      },
      {
        title: "项目档案",
        description:
          "项目档案提供品牌和语气上下文，但不能替代知识库事实。参数、案例和承诺仍必须来自可靠资料。"
      },
      {
        title: "用户管理",
        description:
          "用户角色、状态、部门绑定和密码重置都会影响访问能力。查看者仍以只读、演示和临时查看为主。"
      },
      {
        title: "部门管理",
        description:
          "部门控制模块入口和部分资料可见范围；平台管理员和公司管理员不应被普通部门权限锁死。"
      },
      {
        title: "Provider 状态",
        description:
          "系统设置只展示 Provider 状态和说明。密钥由后端环境变量管理，前端不展示完整密钥，也不新增测试连接入口。"
      },
      {
        title: "使用统计和操作日志",
        description:
          "管理员可查看使用统计和操作日志，用于审计、复盘和排查，不用于替代内容或售后答案审核。"
      }
    ],
    reminders: [
      "保存设置前先确认当前环境。",
      "不要在帮助内容、截图或交接材料中暴露完整密钥。",
      "管理员说明要面向业务使用者，不写成部署或开发文档。"
    ]
  }
];

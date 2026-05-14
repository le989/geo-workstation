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
  { id: "project-init", title: "新项目初始化 SOP" },
  { id: "daily-content", title: "日常内容生产 SOP" },
  { id: "prompt-expansion", title: "AI 拓词与提示词管理 SOP" },
  { id: "knowledge-maintenance", title: "知识库维护 SOP" },
  { id: "quality-publish-review", title: "内容质检、富文本发布稿与效果复盘 SOP" },
  { id: "version-log", title: "版本更新记录" }
] as const;

export const quickStartSteps: HelpStep[] = [
  {
    title: "登录系统",
    description: "进入登录页，使用内部账号进入 GEO 工作站。"
  },
  {
    title: "配置项目档案",
    description: "进入设置页，补齐企业名称、品牌名称、官网、行业、主营产品和内容语气。"
  },
  {
    title: "添加提示词",
    description: "在提示词策略库中新增或批量导入训练词、蒸馏词、品牌词和场景词。"
  },
  {
    title: "建立知识库",
    description: "按项目或产品线建立知识库，放入产品、FAQ、案例、资质和解决方案资料。"
  },
  {
    title: "创建指令模板",
    description: "在指令库准备适合问答、对比、指南或解决方案内容的 GEO 指令。"
  },
  {
    title: "生成内容",
    description: "选择提示词、知识库和指令模板，创建 GEO 内容任务。"
  },
  {
    title: "做质量检查",
    description: "逐篇检查未证实参数、认证、协议、效果承诺和品牌表达风险。"
  },
  {
    title: "生成发布优化版",
    description: "在原文基础上生成更适合发布和 AI 摘取的优化稿，人工确认后再使用。"
  },
  {
    title: "生成富文本发布稿",
    description: "生成带标题、列表、FAQ 和结构化排版的富文本发布稿，复制到发布平台。"
  },
  {
    title: "记录或查看 GEO 效果",
    description: "人工记录模型覆盖情况，并在 GEO 报表中查看内容覆盖和优化建议。"
  }
];

export const sopSections: HelpSection[] = [
  {
    id: "project-init",
    title: "新项目初始化 SOP",
    summary:
      "适合第一次把一个品牌、产品线、服务线或个人项目放进 GEO 工作站时使用。先跑通小样板，再扩大资料和内容规模。",
    steps: [
      {
        title: "进入 /settings 配置项目档案",
        description: "先让系统知道当前项目是谁、面向谁、内容要用什么语气。"
      },
      {
        title: "填写项目基础信息",
        description:
          "填写企业名称、品牌名称、官网、行业、主营产品/服务、目标客户、品牌定位、内容语气和禁止表达。"
      },
      {
        title: "导入第一批提示词",
        description: "从最核心的产品词、服务词和用户常问问题开始，不要一开始追求数量。"
      },
      {
        title: "建立第一个知识库",
        description: "按一条产品线或服务线建立知识库，先把事实底座立起来。"
      },
      {
        title: "导入 5-10 条核心资料",
        description: "优先放真实产品资料、FAQ、案例、服务说明、资质或选型参数。"
      },
      {
        title: "创建或选择通用指令模板",
        description: "先用通用模板跑通问答、指南或对比内容，再逐步沉淀专用模板。"
      },
      {
        title: "生成第一篇测试内容",
        description: "用一条高优先级提示词和一个知识库生成内容，检查系统链路。"
      },
      {
        title: "做质量检查",
        description: "重点看是否出现知识库没有提供的参数、认证、案例或效果承诺。"
      },
      {
        title: "调整知识库和模板",
        description: "把缺少的事实补回知识库，把常见表达要求补进指令模板。"
      },
      {
        title: "形成项目样板",
        description: "确认一条产品线/服务线可用后，再扩展更多提示词和资料。"
      }
    ],
    reminders: [
      "先小范围测试，不要一次性导入大量资料。",
      "先跑通一条产品线 / 服务线，再复制方法到其他方向。",
      "项目档案只提供品牌和语气上下文，事实仍以知识库为准。"
    ]
  },
  {
    id: "daily-content",
    title: "日常内容生产 SOP",
    summary: "适合日常运营时从提示词选择、资料确认、内容生成、质量检查到发布稿准备的固定流程。",
    steps: [
      {
        title: "选择高优先级提示词",
        description: "从提示词策略库中选择最值得覆盖的需求决策、问题诊断或对比类提示词。"
      },
      {
        title: "确认知识库资料是否足够",
        description: "检查产品参数、案例、资质、FAQ 和解决方案是否能支撑这篇内容。"
      },
      {
        title: "选择指令模板",
        description: "根据内容目标选择问答、指南、对比、解决方案或 FAQ 模板。"
      },
      {
        title: "创建内容任务",
        description: "使用真实 AI 或模拟生成创建任务，明确生成目标和关联资料。"
      },
      {
        title: "查看内容项",
        description: "进入内容项，确认标题、正文、GEO 优化点和建议发布位置。"
      },
      {
        title: "做质量检查",
        description: "发布前必须检查事实、风险表达和结构是否满足 GEO 内容目标。"
      },
      {
        title: "生成发布优化版",
        description: "把内容优化成更清楚、更结构化、更适合被 AI 摘取的版本。"
      },
      {
        title: "生成富文本发布稿",
        description: "生成适合粘贴到发布平台的标题、段落、列表和 FAQ 排版。"
      },
      {
        title: "复制到发布平台",
        description: "人工复制富文本或 Markdown 到官网、公众号、B2B 页面或销售资料。"
      },
      {
        title: "后续记录效果",
        description: "发布后记录链接、模型覆盖表现和后续优化动作。"
      }
    ],
    reminders: [
      "不建议一次生成太多篇，先保证每篇能发布、能复盘。",
      "每篇发布前必须做质量检查。",
      "参数、认证、价格、效果承诺必须谨慎，只能使用有依据的信息。"
    ]
  },
  {
    id: "prompt-expansion",
    title: "AI 拓词与提示词管理 SOP",
    summary: "适合把产品、服务、课程、门店或个人品牌方向扩展成真实用户会向 AI 提问的问题。",
    steps: [
      {
        title: "进入 AI 拓词",
        description: "选择规则拓词或 AI 拓词，先生成候选词。"
      },
      {
        title: "输入业务方向",
        description: "填写产品 / 服务 / 课程 / 门店 / 个人品牌方向。"
      },
      {
        title: "补充目标客户、场景和限制条件",
        description: "说明用户是谁、在什么决策场景下提问、哪些方向不要生成。"
      },
      {
        title: "生成候选词",
        description: "使用模拟生成或真实 AI 接口生成候选提示词。"
      },
      {
        title: "检查候选词是否像真实问题",
        description: "优先保留用户真的会问 AI 的完整问题，而不是普通搜索关键词。"
      },
      {
        title: "去掉低价值词",
        description: "去掉泛词、纯价格词、广告词和无法支撑内容生产的词。"
      },
      {
        title: "勾选保存到提示词策略库",
        description: "人工确认后再保存，候选词不会自动入库。"
      },
      {
        title: "设置优先级和追踪状态",
        description: "给高价值词设置优先级，并决定是否进入模型覆盖追踪。"
      }
    ],
    reminders: [
      "候选词不会自动入库，必须人工勾选保存。",
      "要优先保存具体问题，而不是普通关键词。",
      "高价值词应围绕需求决策、问题诊断、对比替代、信任验证、行动前准备。"
    ]
  },
  {
    id: "knowledge-maintenance",
    title: "知识库维护 SOP",
    summary:
      "适合长期维护产品、服务、案例、资质、FAQ 和解决方案资料，让 AI 内容生成有稳定事实来源。",
    steps: [
      {
        title: "按项目或产品线建立知识库",
        description: "避免把不同项目、不同产品线和测试资料混在一起。"
      },
      {
        title: "优先导入真实资料",
        description: "优先使用产品资料、官网内容、FAQ、案例、解决方案、服务说明和资质材料。"
      },
      {
        title: "每条知识片段主题清楚",
        description: "一条片段尽量讲清一个主题，便于内容生成时准确引用。"
      },
      {
        title: "标清资料类型",
        description: "资料类型可分为产品资料、FAQ、案例、解决方案、资质、服务说明等。"
      },
      {
        title: "不确定资料不要写成确定参数",
        description: "对未确认的性能、认证、价格或客户结果要保留边界。"
      },
      {
        title: "使用适合的上传格式",
        description: "文件上传目前适合 txt/md/csv，其他格式先转成可解析文本。"
      },
      {
        title: "定期清理和补充",
        description: "知识库越清楚，AI 越不容易胡编，也更容易生成稳定内容。"
      }
    ],
    reminders: [
      "知识库是事实底座。",
      "具体参数、认证、案例、价格等必须有依据。",
      "不要把测试数据和真实数据混在一起。"
    ]
  },
  {
    id: "quality-publish-review",
    title: "内容质检、富文本发布稿与效果复盘 SOP",
    summary: "适合把生成内容变成可发布稿，并把发布后的链接、覆盖表现和后续优化动作留痕。",
    steps: [
      {
        title: "生成内容后先做质量检查",
        description: "不要直接发布生成稿，先查看质量检查结果。"
      },
      {
        title: "查看风险项",
        description: "逐条确认风险项是否需要删除、补依据或改成更谨慎的表达。"
      },
      {
        title: "重点关注高风险表达",
        description: "未证实参数、未证实协议、未证实认证、夸张宣传、品牌表达过硬。"
      },
      {
        title: "补齐 GEO 结构",
        description: "检查是否缺少 FAQ、列表、判断逻辑、适用场景和选型依据。"
      },
      {
        title: "生成发布优化版",
        description: "让内容更清楚、更克制，也更利于 AI 摘取结构化信息。"
      },
      {
        title: "生成富文本发布稿",
        description: "生成适合复制到发布平台的富文本、Markdown 或纯文本稿件。"
      },
      {
        title: "复制富文本到发布平台",
        description: "人工发布到官网、公众号、B2B 页面或销售资料，不自动外发。"
      },
      {
        title: "记录链接和后续效果",
        description:
          "当前如果没有发布记录模块，可先用外部表格记录，后续再进入 GEO 报表查看内容覆盖和模型覆盖。"
      }
    ],
    reminders: [
      "发布前必须先检查事实依据和风险表达。",
      "富文本发布稿只是排版辅助，不代表内容已经完成审核。",
      "发布记录模块和自动 AI 检测目前标注为后续能力。"
    ],
    pendingNotes: [
      "后续能力：发布记录模块，用于保存发布链接、发布时间、平台和负责人。",
      "后续能力：自动 AI 检测，用于定期检查不同模型下的品牌提及、推荐和官网引用。"
    ]
  }
];

export const versionNotes: VersionNote[] = [
  {
    name: "internal-mvp-v0.2",
    capabilities: ["完成 GEO 诊断、提示词、知识库、指令库、内容生成、模型覆盖和报表主闭环。"],
    usage: "适合内部演示、流程讲解和小范围真实项目试跑。",
    notes: "仍以内部 MVP 为主，真实外部检测、自动发布和复杂协作不在本版本范围内。"
  },
  {
    name: "deployment-ready-v0.1",
    capabilities: ["补齐部署准备文档、环境变量示例、PM2 / Nginx / Docker Compose 示例配置。"],
    usage: "适合准备把系统部署到内网测试机或单 VPS 前做检查。",
    notes: "该版本只提供部署准备材料，不代表已经连接真实服务器或提交真实密钥。"
  },
  {
    name: "auth-ready-v0.1",
    capabilities: ["加入登录页、JWT 登录态、基础鉴权守卫和当前用户显示。"],
    usage: "适合内部账号访问和基础演示隔离。",
    notes: "不包含开放注册、找回密码、OAuth、多租户或复杂菜单级权限。"
  },
  {
    name: "ai-provider-ready-v0.1",
    capabilities: ["加入 OpenAI-compatible AI Provider 抽象，保留默认 Mock 能力。"],
    usage: "适合按需接入 DeepSeek、硅基流动或其他兼容 Chat Completions 的服务。",
    notes: "API Key 只允许放在后端私有环境变量中，前端不输入、不保存、不展示。"
  },
  {
    name: "generic-workstation-v0.1",
    capabilities: ["加入项目档案和跨行业通用模板体系，不再绑定固定行业或示例公司。"],
    usage: "适合企业品牌、产品、服务、课程、门店、本地生活和个人品牌项目试用。",
    notes: "项目档案只提供上下文，具体事实仍必须来自知识库、提示词或任务输入。"
  },
  {
    name: "content-qa-v0.1",
    capabilities: ["加入内容质量检查与发布稿优化能力，聚焦事实依据、风险表达和 GEO 结构。"],
    usage: "适合发布前检查参数、认证、协议、案例、效果承诺和品牌表达风险。",
    notes: "质量检查是辅助流程，最终发布仍需要人工确认。"
  },
  {
    name: "content-format-v0.1",
    capabilities: ["加入富文本发布稿排版、复制和 HTML 下载能力。"],
    usage: "适合把生成内容整理成可粘贴到发布平台的格式。",
    notes: "不会自动发布到外部平台，也不会覆盖原始内容项。"
  },
  {
    name: "ui-polish-v0.1",
    capabilities: ["优化前端页面布局、提示信息、空状态、表格和主要操作体验。"],
    usage: "适合长期自用、内部演示和交接时减少解释成本。",
    notes: "仍保持克制后台风格，不新增后端业务能力。"
  }
];

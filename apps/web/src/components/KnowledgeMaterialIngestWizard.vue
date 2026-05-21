<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessageBox } from "element-plus";
import type { Department } from "@/api/departments";
import type {
  KnowledgeApplicableModule,
  ManualKnowledgeMaterialPayload,
  UploadKnowledgeFileExtraFields
} from "@/api/knowledge";
import { splitCommaValues } from "@/config/geo-prompt-options";
import {
  applicableModuleLabelMap,
  applicableModuleOptions,
  isSupportedKnowledgeFileName,
  materialTopicOptions,
  materialTypeDefaults,
  materialTypeLabelMap,
  materialTypeOptions,
  reviewStatusLabelMap,
  reviewStatusOptions,
  trustLevelLabelMap,
  trustLevelOptions
} from "@/config/knowledge-options";

type IngestMethod = "manual" | "upload";

const props = defineProps<{
  knowledgeBaseName?: string;
  defaultProductLine?: string;
  submitting?: boolean;
  uploading?: boolean;
  canReview?: boolean;
  departments?: Department[];
}>();

const emit = defineEmits<{
  submit: [payload: ManualKnowledgeMaterialPayload];
  upload: [payload: { file: File; extraFields: UploadKnowledgeFileExtraFields }];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const activeStep = ref(0);
const formError = ref("");
const selectedFile = ref<File | null>(null);
const touched = reactive({
  applicableModules: false,
  reviewStatus: false,
  trustLevel: false
});

const form = reactive({
  allowedDepartmentIds: [] as string[],
  applicableModules: ["aftersales-qa", "geo-content", "internal-search"] as KnowledgeApplicableModule[],
  content: "",
  materialTopic: "",
  materialType: "product_material",
  method: "" as IngestMethod | "",
  reviewStatus: "pending" as ManualKnowledgeMaterialPayload["reviewStatus"],
  sourceDescription: "",
  tagsText: "",
  title: "",
  trustLevel: "medium" as ManualKnowledgeMaterialPayload["trustLevel"]
});

const isSaving = computed(() => Boolean(props.submitting || props.uploading));
const selectedMaterialTypeLabel = computed(
  () => materialTypeLabelMap[form.materialType] ?? form.materialType
);
const selectedTopicLabel = computed(() => form.materialTopic || "未填写");
const selectedReviewStatusLabel = computed(
  () => reviewStatusLabelMap[form.reviewStatus ?? "pending"] ?? form.reviewStatus
);
const selectedTrustLevelLabel = computed(
  () => trustLevelLabelMap[form.trustLevel ?? "medium"] ?? form.trustLevel
);
const selectedModuleLabels = computed(() =>
  form.applicableModules.map((item) => applicableModuleLabelMap[item] ?? item).join("、")
);
const selectedDepartmentNames = computed(() => {
  if (form.materialType !== "aftersales_material" || form.allowedDepartmentIds.length === 0) {
    return "";
  }

  return form.allowedDepartmentIds
    .map((id) => props.departments?.find((department) => department.id === id)?.name ?? id)
    .join("、");
});
const contentPreview = computed(() => {
  const content = form.content.trim().replace(/\s+/g, " ");
  if (!content) {
    return "未填写正文";
  }

  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
});
const isDirty = computed(
  () =>
    Boolean(
      form.method ||
        form.title.trim() ||
        form.content.trim() ||
        form.materialTopic ||
        form.sourceDescription.trim() ||
        form.tagsText.trim() ||
        selectedFile.value
    )
);

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const applyMaterialTypeDefaults = () => {
  const defaults = materialTypeDefaults[form.materialType];
  if (!defaults) {
    return;
  }

  if (!touched.applicableModules) {
    form.applicableModules = [...defaults.applicableModules];
  }
  if (!touched.trustLevel) {
    form.trustLevel = defaults.trustLevel;
  }
  if (!touched.reviewStatus) {
    form.reviewStatus = props.canReview ? defaults.reviewStatus : "pending";
  }
  if (form.materialType !== "aftersales_material") {
    form.allowedDepartmentIds = [];
  }
};

const selectMethod = (method: IngestMethod) => {
  form.method = method;
  formError.value = "";
  if (!form.sourceDescription && props.defaultProductLine) {
    form.sourceDescription = `知识库产品线：${props.defaultProductLine}`;
  }
  activeStep.value = 1;
};

const handleMaterialTypeChange = () => {
  applyMaterialTypeDefaults();
};

const validateStep = () => {
  formError.value = "";

  if (activeStep.value === 0 && !form.method) {
    formError.value = "请选择入库方式。";
    return false;
  }

  if (activeStep.value === 1) {
    if (!form.title.trim()) {
      formError.value = "请填写资料标题。";
      return false;
    }
    if (!form.materialType) {
      formError.value = "请选择资料类型。";
      return false;
    }
    if (!form.materialTopic) {
      formError.value = "请选择资料主题，后续可在资料元信息中调整。";
      return false;
    }
    if (form.applicableModules.length === 0) {
      formError.value = "请至少选择一个适用模块。";
      return false;
    }
    if (!form.trustLevel) {
      formError.value = "请选择可信度。";
      return false;
    }
    if (!form.reviewStatus) {
      formError.value = "请选择审核状态。";
      return false;
    }
  }

  if (activeStep.value === 2) {
    if (form.method === "manual" && (!form.content.trim() || form.content.trim().length < 10)) {
      formError.value = "正文至少需要 10 个字符。";
      return false;
    }

    if (form.method === "upload") {
      if (!selectedFile.value) {
        formError.value = "请先选择 TXT、Markdown、CSV、Excel 或 Word 文件。";
        return false;
      }
      if (!isSupportedKnowledgeFileName(selectedFile.value.name)) {
        formError.value = "当前仅支持 txt、md、csv、xlsx、xls、docx；PDF / OCR 属于后续能力。";
        return false;
      }
    }
  }

  return true;
};

const goNext = () => {
  if (!validateStep()) {
    return;
  }
  activeStep.value = Math.min(activeStep.value + 1, 3);
};

const goPrev = () => {
  formError.value = "";
  activeStep.value = Math.max(activeStep.value - 1, 0);
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] ?? null;
  formError.value = "";
};

const resetWizard = () => {
  activeStep.value = 0;
  formError.value = "";
  selectedFile.value = null;
  touched.applicableModules = false;
  touched.reviewStatus = false;
  touched.trustLevel = false;
  Object.assign(form, {
    allowedDepartmentIds: [],
    applicableModules: ["aftersales-qa", "geo-content", "internal-search"],
    content: "",
    materialTopic: "",
    materialType: "product_material",
    method: "",
    reviewStatus: "pending",
    sourceDescription: "",
    tagsText: "",
    title: "",
    trustLevel: "medium"
  });
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const cancelWizard = async () => {
  if (!isDirty.value) {
    resetWizard();
    return;
  }

  try {
    await ElMessageBox.confirm("当前入库信息尚未保存，确认取消并清空吗？", "取消入库", {
      cancelButtonText: "继续填写",
      confirmButtonText: "确认取消",
      type: "warning"
    });
    resetWizard();
  } catch {
    // keep current draft
  }
};

const buildMetadata = (): UploadKnowledgeFileExtraFields => ({
  allowedDepartmentIds:
    form.materialType === "aftersales_material" ? form.allowedDepartmentIds : [],
  applicableModules: form.applicableModules,
  materialTopic: form.materialTopic || undefined,
  materialType: form.materialType || "content_reference_material",
  reviewStatus: props.canReview ? form.reviewStatus : "pending",
  sourceDescription: trimOptional(form.sourceDescription),
  tags: splitCommaValues(form.tagsText),
  title: form.title.trim(),
  trustLevel: form.trustLevel
});

const submit = () => {
  if (!validateStep()) {
    return;
  }

  const metadata = buildMetadata();
  if (form.method === "manual") {
    emit("submit", {
      ...metadata,
      content: form.content.trim(),
      title: form.title.trim()
    });
    return;
  }

  if (form.method === "upload" && selectedFile.value) {
    emit("upload", {
      extraFields: metadata,
      file: selectedFile.value
    });
  }
};
</script>

<template>
  <section class="knowledge-ingest-wizard">
    <div class="knowledge-tab-header">
      <div>
        <p class="section-kicker">资料入库向导</p>
        <h3>按步骤补充企业可引用资料</h3>
        <p>先确认目录、资料类型和适用模块，再录入正文或上传文件，减少字段混用。</p>
      </div>
      <el-tag type="info" effect="plain">PDF / OCR 后置</el-tag>
    </div>

    <el-alert
      title="引用规则说明"
      type="info"
      :closable="false"
      class="knowledge-ingest-rules"
    >
      <p>
        售后问答优先引用已通过且高 / 中可信的售后资料，未命中时才使用已通过产品资料。
        待审核资料可内部查看，但不建议作为正式依据；低可信资料仅用于内部查询。
      </p>
    </el-alert>

    <el-steps :active="activeStep" finish-status="success" class="knowledge-ingest-steps">
      <el-step title="入库方式" />
      <el-step title="资料属性" />
      <el-step title="内容 / 文件" />
      <el-step title="确认保存" />
    </el-steps>

    <el-alert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <section v-if="activeStep === 0" class="knowledge-ingest-methods">
      <button
        type="button"
        :class="{ 'is-selected': form.method === 'manual' }"
        @click="selectMethod('manual')"
      >
        <strong>手动录入</strong>
        <span>适合录入售后经验、公司可信信息、产品说明、案例资料等。</span>
      </button>
      <button
        type="button"
        :class="{ 'is-selected': form.method === 'upload' }"
        @click="selectMethod('upload')"
      >
        <strong>文件上传</strong>
        <span>适合上传 Word、Excel、Markdown、TXT、CSV 等资料文件。</span>
      </button>
    </section>

    <section v-else-if="activeStep === 1" class="knowledge-ingest-panel">
      <el-form class="knowledge-ingest-form" label-position="top">
        <el-form-item label="资料标题" required>
          <el-input v-model="form.title" placeholder="例如：激光测距传感器无输出排查资料" />
          <p class="knowledge-field-help">必填。用于资料列表、引用来源和人工检索。</p>
        </el-form-item>
        <el-form-item label="目录" required>
          <el-input :model-value="props.knowledgeBaseName || '当前知识库'" disabled />
          <p class="knowledge-field-help">资料放在哪里，方便人工整理。本向导默认入库到当前知识库。</p>
        </el-form-item>
        <el-form-item label="资料类型" required>
          <el-select v-model="form.materialType" placeholder="选择资料类型" @change="handleMaterialTypeChange">
            <el-option
              v-for="option in materialTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p class="knowledge-field-help">资料是什么大类，影响系统如何识别资料性质。</p>
        </el-form-item>
        <el-form-item label="资料主题" required>
          <el-select v-model="form.materialTopic" filterable placeholder="选择更细的内容主题">
            <el-option
              v-for="option in materialTopicOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p class="knowledge-field-help">例如资质证书、行业动态、故障排查、安装接线；管理员自定义主题后置。</p>
        </el-form-item>
        <el-form-item label="适用模块" required>
          <el-select
            v-model="form.applicableModules"
            multiple
            placeholder="选择资料可服务的模块"
            @change="touched.applicableModules = true"
          >
            <el-option
              v-for="option in applicableModuleOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p class="knowledge-field-help">决定资料可以被哪些功能使用，自动默认值可手动调整。</p>
        </el-form-item>
        <el-form-item label="审核状态" required>
          <el-select
            v-model="form.reviewStatus"
            :disabled="!props.canReview"
            @change="touched.reviewStatus = true"
          >
            <el-option
              v-for="option in reviewStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p class="knowledge-field-help">只有已通过资料才能被正式引用；非管理员入库默认待审核。</p>
        </el-form-item>
        <el-form-item label="可信度" required>
          <el-select v-model="form.trustLevel" @change="touched.trustLevel = true">
            <el-option
              v-for="option in trustLevelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p class="knowledge-field-help">低可信资料只用于内部查询，不给 AI 正式引用。</p>
        </el-form-item>
        <el-form-item label="产品线 / 产品目录">
          <el-input :model-value="props.defaultProductLine || '未设置'" disabled />
          <p class="knowledge-field-help">沿用当前知识库产品线，后续产品目录精细化管理单独建设。</p>
        </el-form-item>
        <el-form-item label="来源说明">
          <el-input v-model="form.sourceDescription" placeholder="例如 官网资料、售后工程师整理、客户案例复盘" />
          <p class="knowledge-field-help">可选。说明资料来源，便于后续审核和引用核对。</p>
        </el-form-item>
        <el-form-item
          v-if="form.materialType === 'aftersales_material'"
          label="售后资料可见部门"
          class="form-span-2"
        >
          <el-select
            v-model="form.allowedDepartmentIds"
            multiple
            placeholder="选择可查看售后资料的部门；不选则按现有后端安全策略处理"
          >
            <el-option
              v-for="department in props.departments"
              :key="department.id"
              :label="department.name"
              :value="department.id"
            />
          </el-select>
          <p class="knowledge-field-help">仅售后资料显示。管理员可按部门限制普通用户可见范围。</p>
        </el-form-item>
        <el-form-item label="标签" class="form-span-2">
          <el-input v-model="form.tagsText" placeholder="可后补，多个标签用逗号分隔" />
          <p class="knowledge-field-help">可选。标签用于旧片段筛选兼容，不替代资料主题。</p>
        </el-form-item>
      </el-form>
    </section>

    <section v-else-if="activeStep === 2" class="knowledge-ingest-panel">
      <div v-if="form.method === 'manual'" class="knowledge-ingest-content">
        <h4>录入正文内容</h4>
        <p>支持 Markdown 或普通文本。请保留事实依据，去掉无关聊天和临时备注。</p>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="12"
          placeholder="粘贴可被引用的企业事实资料，至少 10 个字符。"
        />
      </div>

      <div v-else class="knowledge-ingest-content">
        <h4>选择资料文件</h4>
        <p>当前支持 TXT、Markdown、CSV、Excel（xls / xlsx）和 Word（docx）。PDF / OCR 后置。</p>
        <div class="knowledge-upload-box">
          <!-- prettier-ignore -->
          <input
            ref="fileInput"
            class="knowledge-upload-input"
            type="file"
            accept=".txt,.md,.csv,.xlsx,.xls,.docx"
            @change="handleFileChange"
          >
          <div class="knowledge-upload-copy">
            <strong>{{ selectedFile?.name ?? "选择 txt / md / csv / Excel / Word 文件" }}</strong>
            <span>上传后会解析为知识片段，并继承前一步设置的资料属性。</span>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="knowledge-ingest-panel">
      <div class="knowledge-ingest-confirm">
        <article>
          <span>入库方式</span>
          <strong>{{ form.method === "manual" ? "手动录入" : "文件上传" }}</strong>
        </article>
        <article>
          <span>资料标题</span>
          <strong>{{ form.title }}</strong>
        </article>
        <article>
          <span>目录</span>
          <strong>{{ props.knowledgeBaseName || "当前知识库" }}</strong>
        </article>
        <article>
          <span>资料类型</span>
          <strong>{{ selectedMaterialTypeLabel }}</strong>
        </article>
        <article>
          <span>资料主题</span>
          <strong>{{ selectedTopicLabel }}</strong>
        </article>
        <article>
          <span>适用模块</span>
          <strong>{{ selectedModuleLabels || "未设置" }}</strong>
        </article>
        <article>
          <span>审核状态</span>
          <strong>{{ selectedReviewStatusLabel }}</strong>
        </article>
        <article>
          <span>可信度</span>
          <strong>{{ selectedTrustLevelLabel }}</strong>
        </article>
        <article>
          <span>来源说明</span>
          <strong>{{ form.sourceDescription || "可后补" }}</strong>
        </article>
        <article v-if="form.materialType === 'aftersales_material'">
          <span>售后可见部门</span>
          <strong>{{ selectedDepartmentNames || "未单独限制" }}</strong>
        </article>
        <article class="form-span-2">
          <span>{{ form.method === "manual" ? "正文摘要" : "文件名" }}</span>
          <strong>{{ form.method === "manual" ? contentPreview : selectedFile?.name }}</strong>
        </article>
      </div>
      <el-alert
        v-if="form.reviewStatus === 'pending'"
        title="待审核资料不会被售后问答或 GEO 内容正式引用。"
        type="warning"
        :closable="false"
        show-icon
      />
    </section>

    <div class="knowledge-ingest-actions">
      <el-button @click="cancelWizard">取消入库</el-button>
      <el-button v-if="activeStep > 0" @click="goPrev">上一步</el-button>
      <el-button v-if="activeStep < 3" type="primary" @click="goNext">下一步</el-button>
      <el-button v-else type="primary" :loading="isSaving" @click="submit">确认保存</el-button>
    </div>
  </section>
</template>

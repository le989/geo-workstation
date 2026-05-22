<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import type { Department } from "@/api/departments";
import type {
  KnowledgeDirectory,
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
import {
  suggestKnowledgeMaterial,
  type KnowledgeMaterialSuggestion
} from "@/utils/knowledge-material-suggest";

type IngestMethod = "manual" | "upload";

const props = defineProps<{
  knowledgeBaseName?: string;
  defaultProductLine?: string;
  submitting?: boolean;
  uploading?: boolean;
  canReview?: boolean;
  departments?: Department[];
  directories?: KnowledgeDirectory[];
  initialMethod?: IngestMethod;
}>();

const emit = defineEmits<{
  submit: [payload: ManualKnowledgeMaterialPayload];
  upload: [payload: { file: File; extraFields: UploadKnowledgeFileExtraFields }];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const formError = ref("");
const selectedFile = ref<File | null>(null);
const advancedOpen = ref(false);
const touched = reactive({
  applicableModules: false,
  materialTopic: false,
  materialType: false,
  reviewStatus: false,
  trustLevel: false
});
const materialSuggestion = ref<KnowledgeMaterialSuggestion | null>(null);

const productDefaults = materialTypeDefaults.product_material;

const form = reactive({
  allowedDepartmentIds: [] as string[],
  applicableModules: [...productDefaults.applicableModules] as KnowledgeApplicableModule[],
  content: "",
  directoryId: "",
  materialTopic: "",
  materialType: "product_material",
  method: "manual" as IngestMethod,
  reviewStatus: productDefaults.reviewStatus as ManualKnowledgeMaterialPayload["reviewStatus"],
  sourceDescription: "",
  tagsText: "",
  title: "",
  trustLevel: productDefaults.trustLevel as ManualKnowledgeMaterialPayload["trustLevel"]
});

const isSaving = computed(() => Boolean(props.submitting || props.uploading));
const isManual = computed(() => form.method === "manual");
const selectedMaterialTypeLabel = computed(
  () => materialTypeLabelMap[form.materialType] ?? form.materialType
);
const selectedReviewStatusLabel = computed(
  () => reviewStatusLabelMap[form.reviewStatus ?? "pending"] ?? form.reviewStatus
);
const selectedTrustLevelLabel = computed(
  () => trustLevelLabelMap[form.trustLevel ?? "medium"] ?? form.trustLevel
);
const selectedModuleLabels = computed(() =>
  form.applicableModules.map((item) => applicableModuleLabelMap[item] ?? item).join("、")
);
const selectedFileName = computed(() => selectedFile.value?.name ?? "");
const activeDirectoryOptions = computed(() =>
  (props.directories ?? []).filter((directory) => directory.status === "active")
);
const selectedDirectoryLabel = computed(() => {
  const directory = activeDirectoryOptions.value.find((item) => item.id === form.directoryId);
  return directory?.name ?? "默认根目录";
});
const shouldSuggestWordSplit = computed(() => {
  const file = selectedFile.value;
  if (!file || !file.name.toLowerCase().endsWith(".docx")) {
    return false;
  }

  const normalizedName = file.name.toLowerCase();
  const comprehensiveWordKeywords = [
    "知识库",
    "资料收集",
    "资料包",
    "综合",
    "整理版",
    "正式版",
    "第二版",
    "geo知识库",
    "faq"
  ];

  return (
    file.size >= 500 * 1024 ||
    comprehensiveWordKeywords.some((keyword) => normalizedName.includes(keyword.toLowerCase()))
  );
});
const selectedDepartmentNames = computed(() => {
  if (form.materialType !== "aftersales_material" || form.allowedDepartmentIds.length === 0) {
    return "";
  }

  return form.allowedDepartmentIds
    .map((id) => props.departments?.find((department) => department.id === id)?.name ?? id)
    .join("、");
});
const materialSuggestionLabel = computed(() => {
  const suggestion = materialSuggestion.value;
  if (!suggestion) {
    return "";
  }

  return suggestion.source === "filename"
    ? "系统根据文件名推荐，可修改"
    : "系统根据标题和正文推荐，可修改";
});
const materialTypeSuggestionHint = computed(() => {
  const suggestion = materialSuggestion.value;
  return suggestion?.materialType && form.materialType === suggestion.materialType
    ? materialSuggestionLabel.value
    : "";
});
const materialTopicSuggestionHint = computed(() => {
  const suggestion = materialSuggestion.value;
  return suggestion?.materialTopic && form.materialTopic === suggestion.materialTopic
    ? "系统推荐，可修改"
    : "";
});
const materialSuggestionHint = computed(
  () => materialTypeSuggestionHint.value || materialTopicSuggestionHint.value
);
const shouldShowNoSuggestionHint = computed(() => {
  if (materialSuggestion.value || form.materialType !== "product_material" || form.materialTopic) {
    return false;
  }

  if (isManual.value) {
    return Boolean(form.title.trim() || form.content.trim());
  }

  return Boolean(selectedFile.value?.name || form.title.trim());
});
const saveButtonText = computed(() => (isManual.value ? "保存资料" : "上传并保存"));
const isDirty = computed(
  () =>
    Boolean(
      form.title.trim() ||
        form.content.trim() ||
        form.directoryId ||
        form.materialTopic ||
        form.sourceDescription.trim() ||
        form.tagsText.trim() ||
        selectedFile.value ||
        form.materialType !== "product_material" ||
        form.allowedDepartmentIds.length > 0
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

const applyMaterialSuggestion = (suggestion: KnowledgeMaterialSuggestion | null) => {
  if (!suggestion) {
    return;
  }

  if (suggestion.materialType && !touched.materialType) {
    form.materialType = suggestion.materialType;
    applyMaterialTypeDefaults();
  }

  if (suggestion.materialTopic && !touched.materialTopic) {
    form.materialTopic = suggestion.materialTopic;
  }
};

const refreshMaterialSuggestion = () => {
  const suggestion = suggestKnowledgeMaterial({
    content: isManual.value ? form.content : undefined,
    fileName: selectedFile.value?.name,
    title: form.title
  });

  materialSuggestion.value = suggestion;
  applyMaterialSuggestion(suggestion);
};

const selectMethod = (method: IngestMethod) => {
  form.method = method;
  formError.value = "";
  if (!form.sourceDescription && props.defaultProductLine) {
    form.sourceDescription = `知识库产品线：${props.defaultProductLine}`;
  }
  refreshMaterialSuggestion();
};

watch(
  () => props.initialMethod,
  (method) => {
    if (method) {
      selectMethod(method);
    }
  },
  { immediate: true }
);

const handleMaterialTypeChange = () => {
  touched.materialType = true;
  applyMaterialTypeDefaults();
};

const handleMaterialTopicChange = () => {
  touched.materialTopic = true;
};

const validateForm = () => {
  formError.value = "";

  if (!form.materialType) {
    formError.value = "请选择资料类型。";
    return false;
  }

  if (form.applicableModules.length === 0) {
    formError.value = "请至少选择一个可用场景。";
    advancedOpen.value = true;
    return false;
  }

  if (!form.trustLevel) {
    formError.value = "请选择可靠程度。";
    advancedOpen.value = true;
    return false;
  }

  if (!form.reviewStatus) {
    formError.value = "请选择资料状态。";
    advancedOpen.value = true;
    return false;
  }

  if (isManual.value) {
    if (!form.title.trim()) {
      formError.value = "请填写资料标题。";
      return false;
    }
    if (!form.content.trim() || form.content.trim().length < 10) {
      formError.value = "正文至少需要 10 个字符。";
      return false;
    }
    return true;
  }

  if (!selectedFile.value) {
    formError.value = "请先选择 TXT、Markdown、CSV、Excel 或 Word 文件。";
    return false;
  }
  if (!isSupportedKnowledgeFileName(selectedFile.value.name)) {
    formError.value = "当前仅支持 txt、md、csv、xlsx、xls、docx；PDF / OCR 属于后续能力。";
    return false;
  }

  return true;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] ?? null;
  formError.value = "";
  refreshMaterialSuggestion();
};

const resetWizard = () => {
  formError.value = "";
  selectedFile.value = null;
  advancedOpen.value = false;
  touched.applicableModules = false;
  touched.materialTopic = false;
  touched.materialType = false;
  touched.reviewStatus = false;
  touched.trustLevel = false;
  materialSuggestion.value = null;
  Object.assign(form, {
    allowedDepartmentIds: [],
    applicableModules: [...productDefaults.applicableModules],
    content: "",
    directoryId: "",
    materialTopic: "",
    materialType: "product_material",
    method: "manual",
    reviewStatus: productDefaults.reviewStatus,
    sourceDescription: "",
    tagsText: "",
    title: "",
    trustLevel: productDefaults.trustLevel
  });
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

watch([() => form.title, () => form.content], () => {
  refreshMaterialSuggestion();
});

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
  directoryId: form.directoryId || undefined,
  materialTopic: form.materialTopic || undefined,
  materialType: form.materialType || "content_reference_material",
  reviewStatus: props.canReview ? form.reviewStatus : "pending",
  sourceDescription: trimOptional(form.sourceDescription),
  tags: splitCommaValues(form.tagsText),
  title: trimOptional(form.title),
  trustLevel: form.trustLevel
});

const submit = () => {
  if (!validateForm()) {
    return;
  }

  const metadata = buildMetadata();
  if (isManual.value) {
    emit("submit", {
      ...metadata,
      content: form.content.trim(),
      title: form.title.trim()
    });
    return;
  }

  if (selectedFile.value) {
    emit("upload", {
      extraFields: metadata,
      file: selectedFile.value
    });
  }
};
</script>

<template>
  <section class="knowledge-ingest-wizard knowledge-ingest-wizard--simple">
    <div class="knowledge-tab-header">
      <div>
        <p class="section-kicker">资料入库向导</p>
        <h3>轻量添加企业资料</h3>
        <p>先选择资料类型和目录，系统会自动设置默认用途；需要细调时展开高级资料属性。</p>
      </div>
      <el-tag type="info" effect="plain">PDF / OCR 后置</el-tag>
    </div>

    <div class="knowledge-ingest-method-tabs" role="tablist" aria-label="选择入库方式">
      <button
        type="button"
        :class="{ 'is-selected': form.method === 'manual' }"
        role="tab"
        :aria-selected="form.method === 'manual'"
        @click="selectMethod('manual')"
      >
        手动录入
      </button>
      <button
        type="button"
        :class="{ 'is-selected': form.method === 'upload' }"
        role="tab"
        :aria-selected="form.method === 'upload'"
        @click="selectMethod('upload')"
      >
        文件上传
      </button>
    </div>

    <el-alert
      v-if="formError"
      :title="formError"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <section class="knowledge-ingest-panel knowledge-ingest-panel--simple">
      <el-form class="knowledge-ingest-form knowledge-ingest-form--simple" label-position="top">
        <template v-if="isManual">
          <el-form-item label="资料标题" required>
            <el-input v-model="form.title" placeholder="例如：激光测距传感器无输出排查资料" />
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="选择文件" required class="form-span-2">
            <div class="knowledge-upload-box knowledge-upload-box--compact">
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
                <span>上传后会解析为知识片段。支持 TXT、Markdown、CSV、Excel（xls / xlsx）和 Word（docx）；PDF / OCR 后置。</span>
              </div>
            </div>
            <el-alert
              v-if="shouldSuggestWordSplit"
              title="建议拆分"
              type="warning"
              :closable="false"
              show-icon
              class="knowledge-word-split-alert"
            >
              <p>
                该 Word 可能包含多个章节或多类资料。建议按公司介绍、产品资料、售后资料、客户案例、FAQ
                等章节拆分后分别入库，避免资料类型和可用场景混乱；仍可作为一条资料上传。
              </p>
              <small>当前文件：{{ selectedFileName }}</small>
            </el-alert>
          </el-form-item>
        </template>

        <el-form-item label="资料类型" required>
          <el-select v-model="form.materialType" placeholder="选择资料类型" @change="handleMaterialTypeChange">
            <el-option
              v-for="option in materialTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <p v-if="materialTypeSuggestionHint" class="knowledge-field-help">
            {{ materialTypeSuggestionHint }}
          </p>
          <p v-else-if="shouldShowNoSuggestionHint" class="knowledge-field-help">
            未识别到合适类型，可手动选择
          </p>
        </el-form-item>

        <el-form-item label="所属目录" required>
          <el-select
            v-model="form.directoryId"
            placeholder="默认根目录"
            clearable
            filterable
          >
            <el-option
              v-for="directory in activeDirectoryOptions"
              :key="directory.id"
              :label="directory.name"
              :value="directory.id"
            />
          </el-select>
          <p class="knowledge-field-help">
            不选择时归入默认根目录；不需要先建目录也能入库。
          </p>
        </el-form-item>

        <el-form-item v-if="isManual" label="正文内容" required class="form-span-2">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="11"
            placeholder="粘贴可被引用的企业事实资料，支持 Markdown 或普通文本，至少 10 个字符。"
          />
        </el-form-item>
      </el-form>
    </section>

    <section class="knowledge-ingest-advanced">
      <button type="button" class="knowledge-ingest-advanced__toggle" @click="advancedOpen = !advancedOpen">
        <span>
          <strong>高级资料属性</strong>
          <small>系统会根据资料类型自动设置用途、资料状态和可靠程度；需要细分主题或调整引用范围时再展开修改。</small>
        </span>
        <em>{{ advancedOpen ? "收起" : "展开" }}</em>
      </button>

      <div v-if="advancedOpen" class="knowledge-ingest-advanced__body">
        <el-form class="knowledge-ingest-form" label-position="top">
          <el-form-item v-if="!isManual" label="资料标题">
            <el-input v-model="form.title" placeholder="可选；不填则默认使用文件名" />
            <p class="knowledge-field-help">可选。用于资料列表和引用来源。</p>
          </el-form-item>

          <el-form-item label="资料主题">
            <el-select
              v-model="form.materialTopic"
              filterable
              clearable
              placeholder="选择更细的内容主题"
              @change="handleMaterialTopicChange"
            >
              <el-option
                v-for="option in materialTopicOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <p v-if="materialTopicSuggestionHint" class="knowledge-field-help">
              {{ materialTopicSuggestionHint }}
            </p>
            <p class="knowledge-field-help">用于细分资料内容，例如资质证书、故障排查、行业动态。</p>
          </el-form-item>

          <el-form-item label="可用场景" required>
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
            <p class="knowledge-field-help">决定资料可被哪些功能使用。</p>
          </el-form-item>

          <el-form-item label="资料状态" required>
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
            <p class="knowledge-field-help">已通过资料才能被正式引用。</p>
          </el-form-item>

          <el-form-item label="可靠程度" required>
            <el-select v-model="form.trustLevel" @change="touched.trustLevel = true">
              <el-option
                v-for="option in trustLevelOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <p class="knowledge-field-help">低可靠资料不会被售后问答 / GEO 内容正式引用。</p>
          </el-form-item>

          <el-form-item label="来源说明">
            <el-input v-model="form.sourceDescription" placeholder="例如 官网资料、售后工程师整理、客户案例复盘" />
            <p class="knowledge-field-help">记录资料来源，便于后续复核。</p>
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

          <el-form-item label="产品线 / 产品目录">
            <el-input :model-value="props.defaultProductLine || '未设置'" disabled />
            <p class="knowledge-field-help">沿用当前知识库产品线，后续产品目录精细化管理单独建设。</p>
          </el-form-item>

          <el-form-item label="标签">
            <el-input v-model="form.tagsText" placeholder="可后补，多个标签用逗号分隔" />
            <p class="knowledge-field-help">可选。标签用于旧片段筛选兼容，不替代资料主题。</p>
          </el-form-item>
        </el-form>
      </div>

      <div v-else class="knowledge-ingest-default-summary">
        <span>默认属性</span>
        <strong>{{ selectedMaterialTypeLabel }}</strong>
        <strong>{{ selectedReviewStatusLabel }}</strong>
        <strong>{{ selectedTrustLevelLabel }}</strong>
        <strong>{{ selectedDirectoryLabel }}</strong>
        <small v-if="materialSuggestionHint">{{ materialSuggestionHint }}</small>
        <small>{{ selectedModuleLabels || "未设置可用场景" }}</small>
        <small v-if="selectedDepartmentNames">售后可见部门：{{ selectedDepartmentNames }}</small>
      </div>
    </section>

    <el-alert
      v-if="form.reviewStatus === 'pending'"
      title="资料已保存为待审核时，通过后才会被 AI 引用。"
      type="warning"
      :closable="false"
      show-icon
    />

    <div class="knowledge-ingest-actions">
      <el-button @click="cancelWizard">取消入库</el-button>
      <el-button type="primary" :loading="isSaving" @click="submit">{{ saveButtonText }}</el-button>
    </div>
  </section>
</template>

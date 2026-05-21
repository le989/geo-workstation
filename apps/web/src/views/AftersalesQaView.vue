<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ChatDotRound, MoreFilled, Plus, Refresh, Search } from "@element-plus/icons-vue";
import {
  askAftersalesConversation,
  createAftersalesConversation,
  getAftersalesFeedback,
  getAftersalesFeedbacks,
  getAftersalesConversation,
  getAftersalesConversations,
  submitAftersalesFeedback,
  updateAftersalesFeedbackStatus,
  updateAftersalesConversation,
  updateAftersalesConversationStatus,
  type AftersalesAnswerStatus,
  type AftersalesCitedSource,
  type AftersalesConversation,
  type AftersalesConversationStatus,
  type AftersalesFeedbackDetail,
  type AftersalesFeedbackErrorType,
  type AftersalesFeedbackListItem,
  type AftersalesFeedbackStatus,
  type AftersalesQuestionRecord
} from "@/api/aftersales-qa";
import AppErrorState from "@/components/AppErrorState.vue";
import { materialTypeLabelMap } from "@/config/knowledge-options";
import { useAuthStore } from "@/stores/auth";
import { normalizeRole } from "@/utils/permission";
import type { KnowledgeMaterialType } from "@/api/knowledge";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recordId?: string;
  question?: string;
  answer?: string;
  status?: AftersalesAnswerStatus;
  feedbackStatus?: AftersalesFeedbackStatus;
  citedSources?: AftersalesCitedSource[];
  isLoading?: boolean;
  createdAt?: string;
};

type ConversationCommand = {
  action: "rename" | "archive" | "restore";
  conversation: AftersalesConversation;
};

const NO_SOURCE_MESSAGE = "当前资料库未命中可引用内容，建议补充对应资料或由售后/技术人员确认。";
const DEFAULT_CONVERSATION_TITLE = "新售后会话";

const answerStatusLabels: Record<AftersalesAnswerStatus, string> = {
  answered: "有依据",
  no_reliable_source: "未找到可引用资料",
  needs_clarification: "需补充信息",
  failed: "生成失败"
};

const answerStatusTagType: Record<AftersalesAnswerStatus, "success" | "warning" | "danger" | "info"> = {
  answered: "success",
  no_reliable_source: "warning",
  needs_clarification: "info",
  failed: "danger"
};
const feedbackErrorTypeLabels: Record<AftersalesFeedbackErrorType, string> = {
  citation_wrong: "引用错了",
  answer_incomplete: "答案不完整",
  answer_wrong: "答案错误",
  knowledge_missing: "知识库缺资料",
  question_unclear: "问题描述不清",
  other: "其他"
};
const feedbackStatusLabels: Record<AftersalesFeedbackStatus, string> = {
  none: "未反馈",
  pending: "待处理",
  handled: "已处理",
  no_action: "无需处理"
};
const feedbackStatusTagType: Record<
  AftersalesFeedbackStatus,
  "success" | "warning" | "danger" | "info"
> = {
  none: "info",
  pending: "warning",
  handled: "success",
  no_action: "info"
};

const authStore = useAuthStore();
const activePanel = ref<"chat" | "feedbacks">("chat");
const conversations = ref<AftersalesConversation[]>([]);
const activeConversation = ref<AftersalesConversation | null>(null);
const records = ref<AftersalesQuestionRecord[]>([]);
const keyword = ref("");
const conversationStatus = ref<AftersalesConversationStatus | "all">("active");
const conversationScope = ref<"mine" | "all">("mine");
const conversationPage = ref(1);
const conversationPageSize = 20;
const conversationTotal = ref(0);
const hasMoreConversations = ref(false);
const question = ref("");
const pendingQuestion = ref("");
const loadingConversations = ref(false);
const loadingDetail = ref(false);
const creatingConversation = ref(false);
const asking = ref(false);
const errorMessage = ref("");
const messageListRef = ref<HTMLElement | null>(null);
const feedbackDialogVisible = ref(false);
const feedbackSubmitting = ref(false);
const selectedFeedbackMessage = ref<ChatMessage | null>(null);
const feedbackForm = ref<{
  errorType: AftersalesFeedbackErrorType;
  correctionText: string;
  description: string;
}>({
  errorType: "answer_wrong",
  correctionText: "",
  description: ""
});
const feedbacks = ref<AftersalesFeedbackListItem[]>([]);
const feedbackStatusFilter = ref<Exclude<AftersalesFeedbackStatus, "none"> | "all">("pending");
const feedbackErrorTypeFilter = ref<AftersalesFeedbackErrorType | "all">("all");
const feedbackPage = ref(1);
const feedbackPageSize = 20;
const feedbackTotal = ref(0);
const pendingFeedbackTotal = ref(0);
const loadingFeedbacks = ref(false);
const feedbackErrorMessage = ref("");
const feedbackDetailVisible = ref(false);
const feedbackDetail = ref<AftersalesFeedbackDetail | null>(null);
const loadingFeedbackDetail = ref(false);
const feedbackHandleNote = ref("");
const updatingFeedbackStatus = ref(false);

const userName = computed(() => authStore.currentUser?.name ?? "我");
const normalizedRole = computed(() =>
  normalizeRole(authStore.currentRole ?? authStore.currentUser?.role)
);
const isAdmin = computed(() =>
  ["platform_admin", "company_admin"].includes(normalizedRole.value)
);
const isActiveConversationArchived = computed(
  () => activeConversation.value?.status === "archived"
);
const canSend = computed(
  () => question.value.trim().length >= 2 && !asking.value && !isActiveConversationArchived.value
);
const conversationHint = computed(() =>
  isActiveConversationArchived.value
    ? "该会话已归档，恢复后可继续提问。"
    : activeConversation.value
    ? "依据已审核售后资料和产品资料辅助排查，未命中资料时提示人工确认。"
    : "基于已审核售后资料和产品资料回答。"
);
const emptyConversationDescription = computed(() => {
  if (keyword.value.trim()) {
    return "没有找到相关会话，换个关键词试试。";
  }
  if (conversationStatus.value === "archived") {
    return "暂无已归档会话。";
  }

  return "还没有售后对话，点击新建会话开始提问。";
});
const feedbackEmptyText = computed(() =>
  feedbackStatusFilter.value === "pending" && feedbackErrorTypeFilter.value === "all"
    ? "暂无待处理反馈"
    : "暂无符合条件的反馈"
);

const messages = computed<ChatMessage[]>(() => {
  const items: ChatMessage[] = [];

  for (const record of records.value) {
    items.push({
      id: `${record.id}-question`,
      role: "user",
      content: record.question,
      createdAt: record.createdAt
    });
    items.push({
      id: `${record.id}-answer`,
      role: "assistant",
      content: record.answer,
      recordId: record.id,
      question: record.question,
      answer: record.answer,
      status: record.answerStatus,
      feedbackStatus: record.feedbackStatus,
      citedSources: record.citedSources,
      createdAt: record.createdAt
    });
  }

  if (pendingQuestion.value) {
    items.push({
      id: "pending-question",
      role: "user",
      content: pendingQuestion.value
    });
  }

  if (asking.value) {
    items.push({
      id: "pending-answer",
      role: "assistant",
      content: "正在查询已审核资料...",
      isLoading: true
    });
  }

  return items;
});

const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN");
const formatConversationTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (isToday) {
    return `今天 ${time}`;
  }
  if (isYesterday) {
    return `昨天 ${time}`;
  }

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  });
};
const formatConversationMeta = (conversation: AftersalesConversation) =>
  `${conversation.messageCount} 轮对话 · ${formatConversationTime(conversation.lastMessageAt)}`;
const materialTypeLabel = (value: KnowledgeMaterialType) => materialTypeLabelMap[value] ?? value;
const getAnswerStatusLabel = (value: AftersalesAnswerStatus) => answerStatusLabels[value] ?? value;
const getAnswerStatusType = (value: AftersalesAnswerStatus) =>
  answerStatusTagType[value] ?? "info";
const getFeedbackStatusLabel = (value?: AftersalesFeedbackStatus) =>
  feedbackStatusLabels[value ?? "none"] ?? "未反馈";
const getFeedbackStatusType = (value?: AftersalesFeedbackStatus) =>
  feedbackStatusTagType[value ?? "none"] ?? "info";
const getFeedbackErrorTypeLabel = (value: AftersalesFeedbackErrorType) =>
  feedbackErrorTypeLabels[value] ?? value;
const getSourceCollapseTitle = (count: number) => `引用来源 ${count} 条`;
const getMessageBubbleClass = (message: ChatMessage) => ({
  "is-loading": message.isLoading,
  "is-no-source": message.status === "no_reliable_source",
  "is-clarification": message.status === "needs_clarification"
});
const getMessageContent = (message: ChatMessage) =>
  message.status === "no_reliable_source"
    ? NO_SOURCE_MESSAGE
    : message.content || NO_SOURCE_MESSAGE;

const scrollToBottom = async () => {
  await nextTick();
  const element = messageListRef.value;

  if (element) {
    element.scrollTop = element.scrollHeight;
  }
};

const loadConversations = async (options: { reset?: boolean; keepActive?: boolean } = {}) => {
  const reset = options.reset ?? true;
  const keepActive = options.keepActive ?? true;

  if (reset) {
    conversationPage.value = 1;
  }
  loadingConversations.value = true;
  errorMessage.value = "";

  try {
    const result = await getAftersalesConversations({
      keyword: keyword.value.trim() || undefined,
      status: conversationStatus.value,
      scope: isAdmin.value ? conversationScope.value : "mine",
      page: conversationPage.value,
      pageSize: conversationPageSize
    });
    conversations.value = reset ? result.items : [...conversations.value, ...result.items];
    conversationTotal.value = result.total;
    hasMoreConversations.value = result.hasMore;

    if (keepActive && activeConversation.value) {
      const refreshed = conversations.value.find((item) => item.id === activeConversation.value?.id);
      if (refreshed) {
        activeConversation.value = refreshed;
        return;
      }
    }

    if (reset && (!activeConversation.value || !keepActive)) {
      records.value = [];
      activeConversation.value = null;
    }

    if (!activeConversation.value && conversations.value.length > 0) {
      await selectConversation(conversations.value[0]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后会话加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loadingConversations.value = false;
  }
};

const loadFeedbacks = async () => {
  if (!isAdmin.value) {
    return;
  }
  loadingFeedbacks.value = true;
  feedbackErrorMessage.value = "";

  try {
    const result = await getAftersalesFeedbacks({
      status: feedbackStatusFilter.value === "all" ? undefined : feedbackStatusFilter.value,
      errorType: feedbackErrorTypeFilter.value === "all" ? undefined : feedbackErrorTypeFilter.value,
      page: feedbackPage.value,
      pageSize: feedbackPageSize
    });
    feedbacks.value = result.items;
    feedbackTotal.value = result.total;
    if (feedbackStatusFilter.value === "pending" && feedbackErrorTypeFilter.value === "all") {
      pendingFeedbackTotal.value = result.total;
    } else {
      void loadPendingFeedbackCount();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "反馈列表加载失败";
    feedbackErrorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loadingFeedbacks.value = false;
  }
};

const loadPendingFeedbackCount = async () => {
  if (!isAdmin.value) {
    return;
  }

  try {
    const result = await getAftersalesFeedbacks({
      status: "pending",
      page: 1,
      pageSize: 1
    });
    pendingFeedbackTotal.value = result.total;
  } catch {
    pendingFeedbackTotal.value = 0;
  }
};

const refreshConversationList = () => loadConversations({ reset: true, keepActive: true });

const handleConversationFilterChange = async () => {
  await loadConversations({ reset: true, keepActive: false });
};

const handlePanelChange = async (panel: "chat" | "feedbacks") => {
  if (panel === "feedbacks") {
    feedbackPage.value = 1;
    await loadFeedbacks();
  }
};

const switchPanel = async (panel: "chat" | "feedbacks") => {
  activePanel.value = panel;
  await handlePanelChange(panel);
};

const handleFeedbackFilterChange = async () => {
  feedbackPage.value = 1;
  await loadFeedbacks();
};

const handleLoadMoreConversations = async () => {
  if (!hasMoreConversations.value || loadingConversations.value) {
    return;
  }

  conversationPage.value += 1;
  await loadConversations({ reset: false, keepActive: true });
};

const selectConversation = async (conversation: AftersalesConversation) => {
  activeConversation.value = conversation;
  loadingDetail.value = true;
  errorMessage.value = "";

  try {
    const detail = await getAftersalesConversation(conversation.id);
    activeConversation.value = detail.conversation;
    records.value = detail.records;
    await scrollToBottom();
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后会话详情加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loadingDetail.value = false;
  }
};

const handleCreateConversation = async () => {
  creatingConversation.value = true;

  try {
    const conversation = await createAftersalesConversation();
    conversations.value = [conversation, ...conversations.value];
    activeConversation.value = conversation;
    records.value = [];
    question.value = "";
    await scrollToBottom();
  } catch (error) {
    const message = error instanceof Error ? error.message : "新建售后会话失败";
    ElMessage.error(message);
  } finally {
    creatingConversation.value = false;
  }
};

const ensureConversation = async () => {
  if (activeConversation.value) {
    return activeConversation.value;
  }

  const conversation = await createAftersalesConversation();
  conversations.value = [conversation, ...conversations.value];
  activeConversation.value = conversation;
  records.value = [];
  return conversation;
};

const handleRenameConversation = async (conversation: AftersalesConversation) => {
  try {
    const { value } = await ElMessageBox.prompt("请输入新的会话标题", "重命名会话", {
      confirmButtonText: "保存",
      cancelButtonText: "取消",
      inputValue: conversation.title,
      inputPattern: /^.{1,60}$/,
      inputErrorMessage: "标题长度需在 1-60 个字符内"
    });
    const renamed = await updateAftersalesConversation(conversation.id, {
      title: String(value).trim()
    });
    conversations.value = conversations.value.map((item) =>
      item.id === renamed.id ? renamed : item
    );

    if (activeConversation.value?.id === renamed.id) {
      activeConversation.value = renamed;
    }
    ElMessage.success("会话已重命名");
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      const message = error instanceof Error ? error.message : "重命名会话失败";
      ElMessage.error(message);
    }
  }
};

const handleUpdateConversationStatus = async (
  conversation: AftersalesConversation,
  status: AftersalesConversationStatus
) => {
  const isArchiving = status === "archived";

  if (isArchiving) {
    try {
      await ElMessageBox.confirm(
        "归档后默认列表不再显示，可在已归档中查看和恢复。",
        "归档会话",
        {
          confirmButtonText: "归档",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
    } catch (error) {
      if (error === "cancel" || error === "close") {
        return;
      }
      throw error;
    }
  }

  try {
    const updated = await updateAftersalesConversationStatus(conversation.id, { status });
    ElMessage.success(isArchiving ? "会话已归档" : "会话已恢复");

    if (activeConversation.value?.id === updated.id) {
      activeConversation.value = updated;
    }

    if (isArchiving && conversationStatus.value === "active") {
      if (activeConversation.value?.id === updated.id) {
        activeConversation.value = null;
        records.value = [];
      }
      await loadConversations({ reset: true, keepActive: false });
      return;
    }

    await loadConversations({ reset: true, keepActive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "会话状态更新失败";
    ElMessage.error(message);
  }
};

const handleConversationCommand = (command: unknown) => {
  const { action, conversation } = command as ConversationCommand;

  if (action === "rename") {
    void handleRenameConversation(conversation);
    return;
  }

  void handleUpdateConversationStatus(
    conversation,
    action === "archive" ? "archived" : "active"
  );
};

const handleAsk = async () => {
  const text = question.value.trim();

  if (text.length < 2) {
    ElMessage.warning("请输入售后问题");
    return;
  }
  if (isActiveConversationArchived.value) {
    ElMessage.warning("该会话已归档，恢复后可继续提问");
    return;
  }

  asking.value = true;
  pendingQuestion.value = text;
  question.value = "";
  await scrollToBottom();

  try {
    const conversation = await ensureConversation();
    const result = await askAftersalesConversation(conversation.id, { question: text });

    records.value.push({
      id: result.recordId,
      companyId: authStore.currentCompany?.id ?? "",
      userId: authStore.currentUser?.id ?? "",
      userName: authStore.currentUser?.name ?? null,
      departmentId: authStore.currentCompany?.department?.id ?? null,
      departmentName: authStore.currentCompany?.department?.name ?? null,
      conversationId: result.conversationId,
      sequence: result.sequence ?? null,
      question: result.question,
      answer: result.answer,
      answerStatus: result.answerStatus,
      citedSources: result.citedSources,
      usedMaterialTypes: result.usedMaterialTypes,
      isAnswered: result.isAnswered,
      hasReliableSource: result.hasReliableSource,
      isMock: result.isMock,
      aiUsageRecordId: null,
      feedbackStatus: "none",
      createdAt: result.createdAt,
      updatedAt: result.createdAt
    });
    pendingQuestion.value = "";
    await loadConversations({ reset: true, keepActive: true });

    if (activeConversation.value) {
      const detail = await getAftersalesConversation(activeConversation.value.id);
      activeConversation.value = detail.conversation;
      records.value = detail.records;
    }
    await scrollToBottom();
  } catch (error) {
    const message = error instanceof Error ? error.message : "售后问题提交失败";
    ElMessage.error(message);
    question.value = text;
  } finally {
    pendingQuestion.value = "";
    asking.value = false;
    await scrollToBottom();
  }
};

const openFeedbackDialog = (message: ChatMessage) => {
  if (!message.recordId) {
    return;
  }

  if (message.feedbackStatus && message.feedbackStatus !== "none") {
    ElMessage.info("你已提交过反馈，再次提交会更新原反馈。");
  }

  selectedFeedbackMessage.value = message;
  feedbackForm.value = {
    errorType: "answer_wrong",
    correctionText: "",
    description: ""
  };
  feedbackDialogVisible.value = true;
};

const handleSubmitFeedback = async () => {
  const message = selectedFeedbackMessage.value;
  const correctionText = feedbackForm.value.correctionText.trim();

  if (!message?.recordId) {
    return;
  }
  if (correctionText.length < 2) {
    ElMessage.warning("请填写正确答案或补充说明");
    return;
  }

  feedbackSubmitting.value = true;

  try {
    const result = await submitAftersalesFeedback(message.recordId, {
      errorType: feedbackForm.value.errorType,
      correctionText,
      description: feedbackForm.value.description.trim() || undefined
    });
    records.value = records.value.map((record) =>
      record.id === result.recordId
        ? {
            ...record,
            feedbackStatus: result.feedbackStatus
          }
        : record
    );
    feedbackDialogVisible.value = false;
    selectedFeedbackMessage.value = null;
    if (isAdmin.value) {
      void loadPendingFeedbackCount();
      if (activePanel.value === "feedbacks") {
        void loadFeedbacks();
      }
    }
    ElMessage.success("反馈已提交，管理员可在「反馈待处理」中查看和处理。");
  } catch (error) {
    const errorMessageText = error instanceof Error ? error.message : "反馈提交失败";
    ElMessage.error(errorMessageText);
  } finally {
    feedbackSubmitting.value = false;
  }
};

const openFeedbackDetail = async (feedback: AftersalesFeedbackListItem) => {
  loadingFeedbackDetail.value = true;
  feedbackDetailVisible.value = true;
  feedbackHandleNote.value = "";

  try {
    feedbackDetail.value = await getAftersalesFeedback(feedback.feedbackId);
    feedbackHandleNote.value = feedbackDetail.value.handleNote ?? "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "反馈详情加载失败";
    ElMessage.error(message);
    feedbackDetailVisible.value = false;
  } finally {
    loadingFeedbackDetail.value = false;
  }
};

const handleUpdateFeedbackStatus = async (
  status: Exclude<AftersalesFeedbackStatus, "none">
) => {
  if (!feedbackDetail.value) {
    return;
  }

  updatingFeedbackStatus.value = true;

  try {
    await updateAftersalesFeedbackStatus(feedbackDetail.value.feedbackId, {
      status,
      handleNote: feedbackHandleNote.value.trim() || undefined
    });
    ElMessage.success(status === "handled" ? "反馈已标记为已处理" : "反馈已标记为无需处理");
    await loadFeedbacks();
    feedbackDetail.value = await getAftersalesFeedback(feedbackDetail.value.feedbackId);
    feedbackHandleNote.value = feedbackDetail.value.handleNote ?? "";
    const updatedFeedback = feedbackDetail.value;
    records.value = records.value.map((record) =>
      record.id === updatedFeedback.questionRecordId
        ? {
            ...record,
            feedbackStatus: updatedFeedback.status
          }
        : record
    );
    void loadPendingFeedbackCount();
  } catch (error) {
    const message = error instanceof Error ? error.message : "反馈状态更新失败";
    ElMessage.error(message);
  } finally {
    updatingFeedbackStatus.value = false;
  }
};

onMounted(() => {
  if (isAdmin.value) {
    conversationScope.value = "all";
    void loadPendingFeedbackCount();
  }
  void loadConversations();
});
</script>

<template>
  <div class="aftersales-page-shell">
    <nav v-if="isAdmin" class="aftersales-panel-tabs" aria-label="售后问答工作台">
      <button
        type="button"
        class="panel-tab"
        :class="{ 'is-active': activePanel === 'chat' }"
        @click="switchPanel('chat')"
      >
        <span>售后对话</span>
        <small>提问、查看引用来源与回答反馈</small>
      </button>
      <button
        type="button"
        class="panel-tab"
        :class="{ 'is-active': activePanel === 'feedbacks' }"
        @click="switchPanel('feedbacks')"
      >
        <span>
          反馈待处理
          <em v-if="pendingFeedbackTotal > 0">{{ pendingFeedbackTotal }}</em>
        </span>
        <small>查看用户纠错意见并标记处理结果</small>
      </button>
    </nav>

    <section v-if="activePanel === 'chat'" class="aftersales-chat-page">
      <aside class="conversation-sidebar">
        <div class="sidebar-header">
          <div>
            <h3>会话记录</h3>
            <span>售后排查历史</span>
          </div>
          <el-button
            :icon="Plus"
            :loading="creatingConversation"
            class="new-conversation-button"
            type="primary"
            @click="handleCreateConversation"
          >
            新建会话
          </el-button>
        </div>

        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          clearable
          placeholder="搜索会话标题"
          @change="handleConversationFilterChange"
          @clear="handleConversationFilterChange"
        />

        <el-segmented
          v-if="isAdmin"
          v-model="conversationScope"
          :options="[
            { label: '我的会话', value: 'mine' },
            { label: '全部会话', value: 'all' }
          ]"
          @change="handleConversationFilterChange"
        />

        <el-segmented
          v-model="conversationStatus"
          :options="[
            { label: '进行中', value: 'active' },
            { label: '已归档', value: 'archived' },
            { label: '全部', value: 'all' }
          ]"
          @change="handleConversationFilterChange"
        />

        <AppErrorState v-if="errorMessage && conversations.length === 0" :message="errorMessage" @retry="refreshConversationList" />

        <el-scrollbar v-else v-loading="loadingConversations" class="conversation-list">
          <article
            v-for="conversation in conversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{ 'is-active': activeConversation?.id === conversation.id }"
            role="button"
            tabindex="0"
            @click="selectConversation(conversation)"
            @keydown.enter.prevent="selectConversation(conversation)"
            @keydown.space.prevent="selectConversation(conversation)"
          >
            <div class="conversation-item__content">
              <span class="conversation-title">{{ conversation.title || DEFAULT_CONVERSATION_TITLE }}</span>
              <small>{{ formatConversationMeta(conversation) }}</small>
              <span class="conversation-meta">
                <el-tag v-if="conversation.status === 'archived'" size="small" type="info" effect="plain">
                  已归档
                </el-tag>
                <span v-if="isAdmin && conversationScope === 'all'">
                  {{ conversation.userName ?? "未知用户" }}
                </span>
              </span>
            </div>
            <el-dropdown
              class="conversation-actions"
              trigger="click"
              @click.stop
              @command="handleConversationCommand"
            >
              <el-button
                :icon="MoreFilled"
                aria-label="会话操作"
                class="conversation-action-button"
                text
                @click.stop
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'rename', conversation }">
                    重命名
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="conversation.status === 'active'"
                    :command="{ action: 'archive', conversation }"
                  >
                    归档
                  </el-dropdown-item>
                  <el-dropdown-item v-else :command="{ action: 'restore', conversation }">
                    恢复
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </article>

          <div v-if="conversations.length > 0" class="load-more-row">
            <el-button
              v-if="hasMoreConversations"
              :loading="loadingConversations"
              plain
              @click="handleLoadMoreConversations"
            >
              加载更多
            </el-button>
            <span v-else>没有更多会话</span>
          </div>

          <el-empty
            v-if="!loadingConversations && conversations.length === 0"
            :description="emptyConversationDescription"
            :image-size="82"
          />
        </el-scrollbar>
      </aside>

      <main class="chat-main">
        <header class="chat-header">
          <div>
            <h2>{{ activeConversation?.title ?? "售后知识助手" }}</h2>
            <p>{{ conversationHint }}</p>
          </div>
          <div class="chat-header__actions">
            <el-tag v-if="activeConversation?.status === 'archived'" type="info" effect="plain">
              已归档
            </el-tag>
            <el-button :icon="Refresh" :disabled="!activeConversation" @click="activeConversation && selectConversation(activeConversation)">
              刷新
            </el-button>
          </div>
        </header>

        <section ref="messageListRef" v-loading="loadingDetail" class="message-list">
          <template v-if="messages.length > 0">
            <article
              v-for="message in messages"
              :key="message.id"
              class="chat-message"
              :class="`is-${message.role}`"
            >
              <div class="message-avatar">{{ message.role === "user" ? userName.slice(0, 1) : "售" }}</div>
              <div class="message-body">
                <div class="message-meta">
                  <strong>{{ message.role === "user" ? userName : "售后知识助手" }}</strong>
                  <span v-if="message.createdAt">{{ formatTime(message.createdAt) }}</span>
                  <el-tag
                    v-if="message.role === 'assistant' && message.status"
                    :type="getAnswerStatusType(message.status)"
                    effect="plain"
                    size="small"
                  >
                    {{ getAnswerStatusLabel(message.status) }}
                  </el-tag>
                </div>
                <div class="message-bubble" :class="getMessageBubbleClass(message)">
                  <el-icon v-if="message.isLoading" class="loading-icon"><ChatDotRound /></el-icon>
                  <p>{{ getMessageContent(message) }}</p>
                </div>

                <el-collapse
                  v-if="message.role === 'assistant' && message.citedSources?.length"
                  class="source-collapse"
                >
                  <el-collapse-item :title="getSourceCollapseTitle(message.citedSources.length)" name="sources">
                    <article
                      v-for="source in message.citedSources"
                      :key="source.chunkId"
                      class="source-item"
                    >
                      <div class="source-title">
                        <strong>{{ source.knowledgeBaseName }} / {{ source.fileTitle }}</strong>
                        <el-tag effect="plain" size="small">
                          {{ materialTypeLabel(source.materialType) }}
                        </el-tag>
                      </div>
                      <p>{{ source.snippet }}</p>
                      <span>片段 {{ source.chunkId }}</span>
                    </article>
                  </el-collapse-item>
                </el-collapse>

                <div
                  v-if="message.role === 'assistant' && !message.isLoading && message.recordId"
                  class="message-feedback-row"
                >
                  <template v-if="message.feedbackStatus && message.feedbackStatus !== 'none'">
                    <el-tag
                      :type="getFeedbackStatusType(message.feedbackStatus)"
                      class="feedback-status-tag"
                      effect="plain"
                      size="small"
                    >
                      已反馈 · {{ getFeedbackStatusLabel(message.feedbackStatus) }}
                    </el-tag>
                    <el-button size="small" text type="info" @click="openFeedbackDialog(message)">
                      补充反馈
                    </el-button>
                  </template>
                  <el-button v-else size="small" text type="info" @click="openFeedbackDialog(message)">
                    回答有误
                  </el-button>
                </div>
              </div>
            </article>
          </template>

          <el-empty
            v-else
            description="先描述产品型号、现场现象、输出方式或接线情况，系统会优先依据已审核资料回答。"
            :image-size="110"
          />
        </section>

        <footer class="composer">
          <el-alert
            v-if="isActiveConversationArchived"
            title="该会话已归档，恢复后可继续提问。"
            type="info"
            :closable="false"
            show-icon
          />
          <el-input
            v-model="question"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            resize="none"
            :disabled="isActiveConversationArchived"
            placeholder="输入内部售后问题，例如：某型号无输出、现场不亮、接线异常等"
            @keydown.meta.enter.prevent="handleAsk"
            @keydown.ctrl.enter.prevent="handleAsk"
          />
          <div class="composer-actions">
            <span>仅依据已审核资料辅助排查；未命中资料时，将提示补充资料或转人工确认。</span>
            <el-button :loading="asking" type="primary" :disabled="!canSend" @click="handleAsk">
              发送
            </el-button>
          </div>
        </footer>
      </main>
    </section>

    <section v-else class="feedback-workbench">
      <header class="feedback-workbench__header">
        <div>
          <h2>反馈待处理</h2>
          <p>管理员在这里查看用户提交的回答纠错，当前仅用于复盘和知识库优化线索。</p>
        </div>
        <el-button :loading="loadingFeedbacks" @click="loadFeedbacks">刷新</el-button>
      </header>

      <el-alert
        v-if="feedbackErrorMessage"
        :title="feedbackErrorMessage"
        class="feedback-error"
        type="warning"
        show-icon
        :closable="false"
      />

      <div class="feedback-filters">
        <el-select
          v-model="feedbackStatusFilter"
          placeholder="处理状态"
          @change="handleFeedbackFilterChange"
        >
          <el-option label="待处理" value="pending" />
          <el-option label="已处理" value="handled" />
          <el-option label="无需处理" value="no_action" />
          <el-option label="全部" value="all" />
        </el-select>
        <el-select
          v-model="feedbackErrorTypeFilter"
          placeholder="错误类型"
          @change="handleFeedbackFilterChange"
        >
          <el-option label="全部类型" value="all" />
          <el-option
            v-for="(label, value) in feedbackErrorTypeLabels"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </div>

      <el-table
        v-loading="loadingFeedbacks"
        :data="feedbacks"
        class="feedback-table"
        :empty-text="feedbackEmptyText"
      >
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="提交人" width="140">
          <template #default="{ row }">
            {{ row.userName ?? "未知用户" }}
          </template>
        </el-table-column>
        <el-table-column label="错误类型" width="130">
          <template #default="{ row }">
            {{ getFeedbackErrorTypeLabel(row.errorType) }}
          </template>
        </el-table-column>
        <el-table-column label="原问题" prop="questionPreview" min-width="180" show-overflow-tooltip />
        <el-table-column label="AI 回答摘要" prop="answerPreview" min-width="220" show-overflow-tooltip />
        <el-table-column label="用户补充说明" prop="correctionTextPreview" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getFeedbackStatusType(row.status)" effect="plain">
              {{ getFeedbackStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="110">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openFeedbackDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="feedback-pagination">
        <el-pagination
          v-model:current-page="feedbackPage"
          :page-size="feedbackPageSize"
          :total="feedbackTotal"
          layout="prev, pager, next, total"
          @current-change="loadFeedbacks"
        />
      </div>
    </section>

    <el-dialog v-model="feedbackDialogVisible" title="提交回答纠错反馈" width="560px">
      <div v-if="selectedFeedbackMessage" class="feedback-dialog-content">
        <div class="feedback-preview">
          <strong>原问题</strong>
          <p>{{ selectedFeedbackMessage.question }}</p>
          <strong>当前回答摘要</strong>
          <p>{{ selectedFeedbackMessage.answer }}</p>
          <span>引用来源：{{ selectedFeedbackMessage.citedSources?.length ?? 0 }} 条</span>
        </div>
        <el-form label-position="top">
          <el-form-item label="错误类型">
            <el-select v-model="feedbackForm.errorType" class="full-width">
              <el-option
                v-for="(label, value) in feedbackErrorTypeLabels"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="正确答案 / 补充说明">
            <el-input
              v-model="feedbackForm.correctionText"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="请填写你认为正确的答案、应补充的资料线索，或需要人工复核的原因。"
            />
          </el-form-item>
          <el-form-item label="备注（可选）">
            <el-input
              v-model="feedbackForm.description"
              type="textarea"
              :rows="3"
              maxlength="1000"
              show-word-limit
              placeholder="可补充现场背景、客户描述或其他说明"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button :loading="feedbackSubmitting" type="primary" @click="handleSubmitFeedback">
          提交反馈
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDetailVisible" title="反馈详情" width="720px">
      <div v-loading="loadingFeedbackDetail" class="feedback-detail">
        <template v-if="feedbackDetail">
          <div class="feedback-detail-grid">
            <section>
              <strong>处理状态</strong>
              <p>
                <el-tag :type="getFeedbackStatusType(feedbackDetail.status)" effect="plain">
                  {{ getFeedbackStatusLabel(feedbackDetail.status) }}
                </el-tag>
              </p>
              <p>
                提交人：{{ feedbackDetail.userName ?? "未知用户" }} ·
                {{ formatTime(feedbackDetail.createdAt) }}
              </p>
              <p v-if="feedbackDetail.handledAt">
                处理人：{{ feedbackDetail.handledByName ?? "未知管理员" }} ·
                {{ formatTime(feedbackDetail.handledAt) }}
              </p>
            </section>
            <section>
              <strong>原问题</strong>
              <p>{{ feedbackDetail.question }}</p>
            </section>
            <section>
              <strong>AI 回答</strong>
              <p>{{ feedbackDetail.answer }}</p>
            </section>
            <section>
              <strong>用户反馈</strong>
              <p>{{ getFeedbackErrorTypeLabel(feedbackDetail.errorType) }}</p>
              <p>{{ feedbackDetail.correctionText }}</p>
              <p v-if="feedbackDetail.description">{{ feedbackDetail.description }}</p>
            </section>
            <section v-if="feedbackDetail.citedSources.length">
              <strong>引用来源</strong>
              <article
                v-for="source in feedbackDetail.citedSources"
                :key="source.chunkId"
                class="source-item"
              >
                <div class="source-title">
                  <strong>{{ source.knowledgeBaseName }} / {{ source.fileTitle }}</strong>
                  <el-tag effect="plain" size="small">
                    {{ materialTypeLabel(source.materialType) }}
                  </el-tag>
                </div>
                <p>{{ source.snippet }}</p>
              </article>
            </section>
            <section>
              <strong>处理备注</strong>
              <el-input
                v-model="feedbackHandleNote"
                type="textarea"
                :rows="3"
                maxlength="1000"
                show-word-limit
                placeholder="记录本次处理说明，不会自动写入知识库"
              />
            </section>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="feedbackDetailVisible = false">关闭</el-button>
        <el-button
          :loading="updatingFeedbackStatus"
          @click="handleUpdateFeedbackStatus('no_action')"
        >
          无需处理
        </el-button>
        <el-button
          :loading="updatingFeedbackStatus"
          type="primary"
          @click="handleUpdateFeedbackStatus('handled')"
        >
          标记已处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.aftersales-page-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.aftersales-panel-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 260px));
  gap: 10px;
}

.panel-tab {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 12px 14px;
  color: #334155;
  text-align: left;
  cursor: pointer;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.panel-tab:hover {
  border-color: #aebbe8;
  box-shadow: 0 10px 24px rgb(15 23 42 / 6%);
}

.panel-tab.is-active {
  border-color: #7c8cf8;
  background: #f8f9ff;
  box-shadow: inset 3px 0 0 #6f7df5;
}

.panel-tab span {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
}

.panel-tab small {
  color: var(--el-text-color-secondary);
  line-height: 1.45;
}

.panel-tab em {
  min-width: 22px;
  padding: 1px 7px;
  color: #fff;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  background: #c2410c;
}

.aftersales-chat-page {
  display: flex;
  height: calc(100vh - 132px);
  min-height: 560px;
  max-height: calc(100vh - 132px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f7f8fa;
  box-shadow: 0 16px 36px rgb(15 23 42 / 7%);
}

.conversation-sidebar {
  display: flex;
  flex: 0 0 320px;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
}

.sidebar-header,
.chat-header,
.chat-header__actions,
.composer-actions,
.source-title,
.message-meta {
  display: flex;
  align-items: center;
}

.sidebar-header,
.chat-header,
.composer-actions,
.source-title {
  justify-content: space-between;
  gap: 12px;
}

.sidebar-header h3,
.chat-header h2 {
  margin: 0;
}

.sidebar-header span,
.chat-header p,
.conversation-item small,
.conversation-meta,
.composer-actions span,
.source-item span,
.message-meta span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.new-conversation-button {
  flex: 0 0 auto;
  border-radius: 8px;
  font-weight: 600;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.conversation-item {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  min-height: 78px;
  margin-bottom: 7px;
  padding: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: var(--el-text-color-primary);
  text-align: left;
  background: rgb(255 255 255 / 76%);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.conversation-item:hover,
.conversation-item.is-active,
.conversation-item:focus-visible {
  border-color: #c8c2f0;
  background: #fff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 8%);
  outline: none;
}

.conversation-item.is-active {
  box-shadow: inset 3px 0 0 #6d40d7, 0 8px 22px rgb(15 23 42 / 8%);
}

.conversation-item:hover {
  transform: translateY(-1px);
}

.conversation-item__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.conversation-title {
  display: block;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.conversation-actions {
  flex: 0 0 auto;
}

.conversation-action-button {
  width: 28px;
  height: 28px;
  color: var(--el-text-color-secondary);
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.chat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #fff;
}

.chat-header {
  flex: 0 0 auto;
  padding: 16px 18px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.chat-header h2 {
  font-size: 18px;
}

.chat-header p {
  margin: 4px 0 0;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 14px;
  background: linear-gradient(180deg, #fff, #f8fafc 52%, #f1f5f9);
}

.chat-message {
  display: flex;
  gap: 12px;
  max-width: 920px;
  margin: 0 auto 14px;
}

.chat-message.is-user {
  flex-direction: row-reverse;
}

.message-avatar {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: #394150;
  font-weight: 700;
  background: #e9edf3;
}

.chat-message.is-assistant .message-avatar {
  color: #24514a;
  background: #dff4ed;
}

.message-body {
  min-width: 0;
  max-width: min(760px, 82%);
}

.chat-message.is-user .message-body {
  align-items: flex-end;
}

.message-meta {
  gap: 8px;
  margin-bottom: 5px;
}

.chat-message.is-user .message-meta {
  justify-content: flex-end;
}

.message-bubble {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgb(15 23 42 / 5%);
}

.chat-message.is-user .message-bubble {
  color: #18202f;
  border-color: #d8e0ea;
  background: #eef3f8;
  box-shadow: none;
}

.message-bubble p {
  margin: 0;
  line-height: 1.75;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.message-bubble.is-loading {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--el-text-color-secondary);
}

.message-bubble.is-no-source {
  border-color: #f5dc91;
  background: #fffaf0;
}

.message-bubble.is-clarification {
  border-color: #c7d2fe;
  background: #f8faff;
}

.loading-icon {
  animation: pulse 1.2s ease-in-out infinite;
}

.source-collapse {
  margin-top: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.source-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
  padding: 10px 12px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #fbfcfe;
}

.source-item:last-child {
  border-bottom: 0;
}

.source-item p {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.composer {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 8px;
  padding: 12px 18px 14px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 -8px 20px rgb(15 23 42 / 4%);
}

.composer-actions {
  align-items: center;
  flex-wrap: wrap;
}

.message-feedback-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
  margin-top: 7px;
}

.feedback-status-tag {
  flex: 0 0 auto;
}

.feedback-workbench {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 172px);
  min-height: 540px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 36px rgb(15 23 42 / 7%);
}

.feedback-workbench__header,
.feedback-filters,
.feedback-pagination {
  display: flex;
  align-items: center;
}

.feedback-workbench__header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.feedback-workbench__header h2 {
  margin: 0;
  font-size: 18px;
}

.feedback-workbench__header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.feedback-filters {
  gap: 10px;
  margin-bottom: 12px;
}

.feedback-error {
  margin-bottom: 12px;
}

.feedback-filters .el-select {
  width: 180px;
}

.feedback-table {
  flex: 1;
  min-height: 0;
}

.feedback-pagination {
  justify-content: flex-end;
  padding-top: 12px;
}

.feedback-dialog-content,
.feedback-detail-grid {
  display: grid;
  gap: 14px;
}

.feedback-preview {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.feedback-preview p,
.feedback-detail p {
  margin: 6px 0 10px;
  color: var(--el-text-color-regular);
  line-height: 1.65;
  white-space: pre-line;
}

.feedback-preview p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.feedback-preview span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.feedback-detail {
  min-height: 220px;
}

.feedback-detail-grid section {
  padding: 12px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #fbfcfe;
}

.full-width {
  width: 100%;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 960px) {
  .aftersales-panel-tabs {
    grid-template-columns: 1fr;
  }

  .aftersales-chat-page {
    flex-direction: column;
    height: auto;
    max-height: none;
  }

  .conversation-sidebar {
    flex: 0 0 auto;
    min-height: 260px;
    max-height: 40vh;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .sidebar-header {
    align-items: flex-start;
  }

  .new-conversation-button {
    min-width: 112px;
  }

  .message-body {
    max-width: 86%;
  }
}
</style>

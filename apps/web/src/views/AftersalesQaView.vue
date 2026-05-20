<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ChatDotRound, EditPen, Plus, Refresh, Search } from "@element-plus/icons-vue";
import {
  askAftersalesConversation,
  createAftersalesConversation,
  getAftersalesConversation,
  getAftersalesConversations,
  updateAftersalesConversation,
  updateAftersalesConversationStatus,
  type AftersalesAnswerStatus,
  type AftersalesCitedSource,
  type AftersalesConversation,
  type AftersalesConversationStatus,
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
  status?: AftersalesAnswerStatus;
  citedSources?: AftersalesCitedSource[];
  isLoading?: boolean;
  createdAt?: string;
};

const NO_SOURCE_MESSAGE = "知识库中未找到可靠依据，建议补充资料或转人工确认。";
const DEFAULT_CONVERSATION_TITLE = "新售后会话";

const answerStatusLabels: Record<AftersalesAnswerStatus, string> = {
  answered: "有依据",
  no_reliable_source: "无可靠依据",
  needs_clarification: "需补充信息",
  failed: "生成失败"
};

const answerStatusTagType: Record<AftersalesAnswerStatus, "success" | "warning" | "danger" | "info"> = {
  answered: "success",
  no_reliable_source: "warning",
  needs_clarification: "info",
  failed: "danger"
};

const authStore = useAuthStore();
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
    ? "基于已通过售后资料优先回答，产品资料仅作兜底。"
    : "选择历史会话或新建会话后开始提问。"
);
const emptyConversationDescription = computed(() => {
  if (keyword.value.trim()) {
    return "没有找到相关会话，换个关键词试试。";
  }
  if (conversationStatus.value === "archived") {
    return "暂无已归档会话。";
  }

  return "还没有售后对话，点击左上角新建会话开始提问。";
});

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
      status: record.answerStatus,
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
      content: "正在检索知识库...",
      isLoading: true
    });
  }

  return items;
});

const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN");
const materialTypeLabel = (value: KnowledgeMaterialType) => materialTypeLabelMap[value] ?? value;
const getAnswerStatusLabel = (value: AftersalesAnswerStatus) => answerStatusLabels[value] ?? value;
const getAnswerStatusType = (value: AftersalesAnswerStatus) =>
  answerStatusTagType[value] ?? "info";

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

const refreshConversationList = () => loadConversations({ reset: true, keepActive: true });

const handleConversationFilterChange = async () => {
  await loadConversations({ reset: true, keepActive: false });
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

onMounted(() => {
  if (isAdmin.value) {
    conversationScope.value = "all";
  }
  void loadConversations();
});
</script>

<template>
  <section class="aftersales-chat-page">
    <aside class="conversation-sidebar">
      <div class="sidebar-header">
        <div>
          <h3>售后问答</h3>
          <span>内部售后 AI 助手</span>
        </div>
        <el-button
          :icon="Plus"
          :loading="creatingConversation"
          type="primary"
          circle
          @click="handleCreateConversation"
        />
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
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ 'is-active': activeConversation?.id === conversation.id }"
          type="button"
          @click="selectConversation(conversation)"
        >
          <span class="conversation-title">{{ conversation.title || DEFAULT_CONVERSATION_TITLE }}</span>
          <small>{{ formatTime(conversation.lastMessageAt) }}</small>
          <span class="conversation-meta">
            <el-tag v-if="conversation.status === 'archived'" size="small" type="info" effect="plain">
              已归档
            </el-tag>
            <span>{{ conversation.messageCount }} 轮</span>
            <span v-if="isAdmin && conversationScope === 'all'">
              {{ conversation.userName ?? "未知用户" }}
            </span>
          </span>
          <el-button
            class="rename-button"
            :icon="EditPen"
            link
            type="primary"
            @click.stop="handleRenameConversation(conversation)"
          >
            重命名
          </el-button>
          <el-button
            v-if="conversation.status === 'active'"
            class="archive-button"
            link
            type="warning"
            @click.stop="handleUpdateConversationStatus(conversation, 'archived')"
          >
            归档
          </el-button>
          <el-button
            v-else
            class="archive-button"
            link
            type="success"
            @click.stop="handleUpdateConversationStatus(conversation, 'active')"
          >
            恢复
          </el-button>
        </button>

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
          <h2>{{ activeConversation?.title ?? "基于知识库的内部售后 AI 助手" }}</h2>
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
                <strong>{{ message.role === "user" ? userName : "售后 AI 助手" }}</strong>
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
              <div class="message-bubble" :class="{ 'is-loading': message.isLoading }">
                <el-icon v-if="message.isLoading" class="loading-icon"><ChatDotRound /></el-icon>
                <p>{{ message.content || NO_SOURCE_MESSAGE }}</p>
              </div>

              <el-collapse
                v-if="message.role === 'assistant' && message.citedSources?.length"
                class="source-collapse"
              >
                <el-collapse-item title="引用来源" name="sources">
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
            </div>
          </article>
        </template>

        <el-empty
          v-else
          description="新建会话后输入售后问题，回答会优先引用已通过售后资料。"
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
          <span>不会进行自由聊天；无可靠依据时会提示补充资料或转人工确认。</span>
          <el-button :loading="asking" type="primary" :disabled="!canSend" @click="handleAsk">
            发送
          </el-button>
        </div>
      </footer>
    </main>
  </section>
</template>

<style scoped>
.aftersales-chat-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  min-height: calc(100vh - 132px);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
}

.conversation-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-extra-light);
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

.conversation-list {
  flex: 1;
  min-height: 0;
}

.conversation-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  width: 100%;
  min-height: 92px;
  margin-bottom: 8px;
  padding: 12px 76px 12px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--el-text-color-primary);
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.conversation-item:hover,
.conversation-item.is-active {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-bg-color);
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

.rename-button {
  position: absolute;
  right: 10px;
  top: 10px;
}

.archive-button {
  position: absolute;
  right: 10px;
  top: 42px;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
}

.chat-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.chat-header h2 {
  font-size: 18px;
}

.chat-header p {
  margin: 4px 0 0;
}

.message-list {
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(180deg, var(--el-bg-color), var(--el-fill-color-extra-light));
}

.chat-message {
  display: flex;
  gap: 12px;
  max-width: 860px;
  margin: 0 auto 18px;
}

.chat-message.is-user {
  flex-direction: row-reverse;
}

.message-avatar {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  background: var(--el-color-primary);
}

.chat-message.is-assistant .message-avatar {
  background: var(--el-color-success);
}

.message-body {
  min-width: 0;
  max-width: min(720px, 80%);
}

.chat-message.is-user .message-body {
  align-items: flex-end;
}

.message-meta {
  gap: 8px;
  margin-bottom: 6px;
}

.chat-message.is-user .message-meta {
  justify-content: flex-end;
}

.message-bubble {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: 0 8px 24px rgb(0 0 0 / 4%);
}

.chat-message.is-user .message-bubble {
  color: #fff;
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.message-bubble p {
  margin: 0;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.message-bubble.is-loading {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--el-text-color-secondary);
}

.loading-icon {
  animation: pulse 1.2s ease-in-out infinite;
}

.source-collapse {
  margin-top: 8px;
  border-radius: 8px;
  background: var(--el-bg-color);
}

.source-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.source-item:last-child {
  border-bottom: 0;
}

.source-item p {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.composer-actions {
  align-items: center;
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
  .aftersales-chat-page {
    grid-template-columns: 1fr;
  }

  .conversation-sidebar {
    min-height: 260px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .message-body {
    max-width: 86%;
  }
}
</style>

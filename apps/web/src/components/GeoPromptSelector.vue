<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { getGeoPrompts, type GeoPrompt } from "@/api/geo-prompts";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import { formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";

const props = defineProps<{
  modelValue: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const prompts = ref<GeoPrompt[]>([]);
const search = ref("");
const loading = ref(false);
const errorMessage = ref("");
const localSelectedIds = ref<string[]>([]);

const selectedCount = computed(() => localSelectedIds.value.length);
const visibleSelectableIds = computed(() => prompts.value.map((prompt) => prompt.id));
const allVisibleSelected = computed(
  () =>
    visibleSelectableIds.value.length > 0 &&
    visibleSelectableIds.value.every((id) => localSelectedIds.value.includes(id))
);

watch(
  () => props.modelValue,
  (value) => {
    localSelectedIds.value = [...value];
  },
  { immediate: true }
);

const syncSelected = (nextIds: string[]) => {
  localSelectedIds.value = [...new Set(nextIds)];
  emit("update:modelValue", localSelectedIds.value);
};

const loadPrompts = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getGeoPrompts({
      page: 1,
      pageSize: 50,
      search: search.value.trim() || undefined
    });
    prompts.value = result.items;
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? `${error.message}。后端未连接时仍可继续填写其他字段。`
        : "提示词加载失败。";
    prompts.value = [];
  } finally {
    loading.value = false;
  }
};

const togglePrompt = (id: string, checked: boolean) => {
  if (checked) {
    syncSelected([...localSelectedIds.value, id]);
    return;
  }

  syncSelected(localSelectedIds.value.filter((selectedId) => selectedId !== id));
};

const selectVisible = () => {
  syncSelected([...localSelectedIds.value, ...visibleSelectableIds.value]);
};

const clearSelection = () => {
  syncSelected([]);
};

const getUserIntentLabel = (prompt: GeoPrompt) =>
  userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent;

onMounted(() => {
  void loadPrompts();
});
</script>

<template>
  <section class="geo-prompt-selector">
    <div class="geo-prompt-selector__toolbar">
      <el-input
        v-model="search"
        clearable
        :disabled="disabled"
        placeholder="搜索 GEO 提示词"
        @keyup.enter="loadPrompts"
      />
      <el-button :loading="loading" :disabled="disabled" @click="loadPrompts">搜索提示词</el-button>
      <el-button :disabled="disabled || allVisibleSelected" @click="selectVisible">
        勾选当前结果
      </el-button>
      <el-button :disabled="disabled || selectedCount === 0" @click="clearSelection">
        清空选择
      </el-button>
      <span>已选 {{ selectedCount }} 个 GEO 提示词</span>
    </div>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="dialog-alert"
    />

    <el-table
      v-loading="loading"
      :data="prompts"
      border
      row-key="id"
      height="320"
      empty-text="暂无可选择的 GEO 提示词"
    >
      <el-table-column label="选择" width="72" fixed>
        <template #default="{ row }">
          <el-checkbox
            :model-value="localSelectedIds.includes(row.id)"
            :disabled="disabled"
            @change="togglePrompt(row.id, Boolean($event))"
          />
        </template>
      </el-table-column>
      <el-table-column label="GEO 提示词" min-width="260">
        <template #default="{ row }">
          <strong>{{ row.promptText }}</strong>
          <p class="table-subtext">训练词：{{ formatOptional(row.baseWord) }}</p>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <GeoPromptTypeTag :type="row.type" />
        </template>
      </el-table-column>
      <el-table-column label="产品线" width="150">
        <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
      </el-table-column>
      <el-table-column label="用户意图" width="130">
        <template #default="{ row }">
          {{ getUserIntentLabel(row) }}
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="90" />
    </el-table>
  </section>
</template>

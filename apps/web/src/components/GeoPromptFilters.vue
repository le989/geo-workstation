<script setup lang="ts">
import { reactive, watch } from "vue";
import type { GeoPromptQuery, GeoPromptType } from "@/api/geo-prompts";
import {
  coverageStatusOptions,
  geoPromptTypeOptions,
  userIntentOptions
} from "@/config/geo-prompt-options";

const props = defineProps<{
  modelValue: GeoPromptQuery;
  activeType?: GeoPromptType;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: GeoPromptQuery];
  search: [];
  reset: [];
  "type-change": [value?: GeoPromptType];
}>();

const localFilters = reactive<GeoPromptQuery>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(localFilters, value);
  },
  { deep: true }
);

watch(
  localFilters,
  () => {
    emit("update:modelValue", { ...localFilters });
  },
  { deep: true }
);

const handleTabChange = (name: string | number) => {
  emit("type-change", name === "all" ? undefined : (name as GeoPromptType));
};
</script>

<template>
  <section class="geo-prompts-filter-panel">
    <el-tabs
      :model-value="activeType ?? 'all'"
      class="geo-prompt-tabs"
      @tab-change="handleTabChange"
    >
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane
        v-for="option in geoPromptTypeOptions"
        :key="option.value"
        :label="option.label"
        :name="option.value"
      />
    </el-tabs>

    <el-form class="geo-prompts-filters geo-prompts-filters--basic" label-position="top">
      <el-form-item label="搜索">
        <el-input
          v-model="localFilters.search"
          clearable
          placeholder="搜索提示词、训练词或应用场景"
          @keyup.enter="emit('search')"
        />
      </el-form-item>
      <el-form-item label="是否追踪">
        <el-select v-model="localFilters.trackEnabled" clearable placeholder="全部">
          <el-option label="追踪" :value="true" />
          <el-option label="不追踪" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item label="最新覆盖状态">
        <el-select v-model="localFilters.latestCoverageStatus" clearable placeholder="全部状态">
          <el-option
            v-for="option in coverageStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <el-collapse class="geo-prompts-advanced-filter">
      <el-collapse-item title="高级筛选" name="advanced">
        <el-form class="geo-prompts-filters geo-prompts-filters--advanced" label-position="top">
          <el-form-item label="产品线">
            <el-input v-model="localFilters.productLine" clearable placeholder="输入产品线" />
          </el-form-item>
          <el-form-item label="用户意图">
            <el-select v-model="localFilters.userIntent" clearable placeholder="全部意图">
              <el-option
                v-for="option in userIntentOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="localFilters.priority" clearable placeholder="全部优先级">
              <el-option
                v-for="priority in [1, 2, 3, 4, 5]"
                :key="priority"
                :label="`P${priority}`"
                :value="priority"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <p class="geo-prompts-filter-note">
          来源、目标模型和创建时间保留在提示词详情中查看；如需定位，可先使用搜索框按关键词查询。
        </p>
      </el-collapse-item>
    </el-collapse>

    <div class="geo-prompts-actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </div>
  </section>
</template>

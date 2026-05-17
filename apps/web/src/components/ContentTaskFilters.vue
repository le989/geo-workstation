<script setup lang="ts">
import { ref } from "vue";
import type { ContentTaskQuery } from "@/api/content";
import { contentTaskStatusOptions, generationTypeOptions } from "@/config/content-options";

const props = defineProps<{
  modelValue: ContentTaskQuery;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ContentTaskQuery];
  search: [];
  reset: [];
}>();

const updateField = <K extends keyof ContentTaskQuery>(key: K, value: ContentTaskQuery[K]) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value
  });
};

const showAdvancedFilters = ref(false);
</script>

<template>
  <el-card class="content-filter-card" shadow="never">
    <div class="content-filter-card__header">
      <div>
        <p class="section-kicker">内容任务筛选</p>
        <h2>筛选内容任务</h2>
      </div>
      <span>默认先按任务、状态和内容类型查找；低频条件放到高级筛选。</span>
    </div>
    <el-form class="content-filters" label-position="top">
      <el-form-item label="搜索任务 / GEO 词">
        <el-input
          :model-value="modelValue.search"
          clearable
          placeholder="搜索任务名称、产品线、生成类型或目标模型"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('search', $event)"
        />
      </el-form-item>
      <el-form-item label="任务状态">
        <el-select
          :model-value="modelValue.status"
          clearable
          placeholder="全部状态"
          @update:model-value="updateField('status', $event)"
        >
          <el-option
            v-for="option in contentTaskStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="内容类型">
        <el-select
          :model-value="modelValue.generationType"
          clearable
          filterable
          allow-create
          placeholder="全部类型"
          @update:model-value="updateField('generationType', $event)"
        >
          <el-option
            v-for="option in generationTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <div class="filter-actions">
        <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
        <el-button text type="primary" @click="showAdvancedFilters = !showAdvancedFilters">
          {{ showAdvancedFilters ? "收起筛选" : "高级筛选" }}
        </el-button>
      </div>
    </el-form>

    <el-form
      v-if="showAdvancedFilters"
      class="content-filters content-filters--advanced"
      label-position="top"
    >
      <el-form-item label="产品线">
        <el-input
          :model-value="modelValue.productLine"
          clearable
          placeholder="按产品线筛选"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('productLine', $event)"
        />
      </el-form-item>
      <el-form-item label="生成方式 / 模型">
        <el-input
          :model-value="modelValue.targetModel"
          clearable
          placeholder="按模型名称或生成方式筛选"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('targetModel', $event)"
        />
      </el-form-item>
      <div class="content-filter-card__note">
        高级筛选用于缩小当前内容任务列表范围。
      </div>
    </el-form>
  </el-card>
</template>

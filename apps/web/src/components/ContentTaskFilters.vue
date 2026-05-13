<script setup lang="ts">
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
</script>

<template>
  <el-card class="content-filter-card" shadow="never">
    <el-form class="content-filters" label-position="top">
      <el-form-item label="搜索">
        <el-input
          :model-value="modelValue.search"
          clearable
          placeholder="搜索 name / productLine / generationType / targetModel"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('search', $event)"
        />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input
          :model-value="modelValue.productLine"
          clearable
          placeholder="按产品线筛选"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('productLine', $event)"
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
      <el-form-item label="生成类型">
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
      <el-form-item label="目标模型">
        <el-input
          :model-value="modelValue.targetModel"
          clearable
          placeholder="例如 deepseek-chat"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('targetModel', $event)"
        />
      </el-form-item>
      <div class="filter-actions">
        <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
      </div>
    </el-form>
  </el-card>
</template>

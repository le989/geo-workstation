<script setup lang="ts">
import { reactive, watch } from "vue";
import type { KnowledgeBaseQuery } from "@/api/knowledge";
import { knowledgeBaseStatusOptions } from "@/config/knowledge-options";

const props = defineProps<{
  modelValue: KnowledgeBaseQuery;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: KnowledgeBaseQuery];
  search: [];
  reset: [];
  create: [];
}>();

const localFilters = reactive<KnowledgeBaseQuery>({ ...props.modelValue });

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
</script>

<template>
  <section class="knowledge-filter-panel">
    <div class="knowledge-filter-copy">
      <div>
        <p class="section-kicker">知识资产</p>
        <h2>知识库筛选</h2>
        <p>按产品线、状态和关键词查看哪些企业事实资料已经沉淀为 GEO 知识资产。</p>
      </div>
      <el-button type="primary" @click="emit('create')">新建知识库</el-button>
    </div>

    <el-form class="knowledge-filters" label-position="top">
      <el-form-item label="搜索">
        <el-input
          v-model="localFilters.search"
          clearable
          placeholder="搜索名称、产品线或说明"
          @keyup.enter="emit('search')"
        />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input v-model="localFilters.productLine" clearable placeholder="输入产品线" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="localFilters.status" clearable placeholder="全部状态">
          <el-option
            v-for="option in knowledgeBaseStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="localFilters.createdBy" clearable placeholder="创建人 ID" />
      </el-form-item>
    </el-form>

    <div class="knowledge-actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
      <el-button type="success" @click="emit('create')">新建知识库</el-button>
    </div>
  </section>
</template>

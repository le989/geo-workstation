<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { InstructionTemplateQuery } from "@/api/instructions";
import type { GeoPromptType } from "@/api/geo-prompts";
import {
  contentTypeOptions,
  instructionTypeOptions,
  targetModelOptions,
  targetPromptTypeOptions
} from "@/config/instruction-options";

const props = defineProps<{
  modelValue: InstructionTemplateQuery;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: InstructionTemplateQuery];
  search: [];
  reset: [];
  create: [];
}>();

const localFilters = reactive<InstructionTemplateQuery>({ ...props.modelValue });
const showAdvancedFilters = ref(false);

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
  <section class="instruction-filter-panel">
    <div class="instruction-filter-copy">
      <div>
        <p class="section-kicker">指令筛选</p>
        <h2>筛选指令模板</h2>
        <p>指令库管理内容怎么写；提示词策略库管理用户会问什么。</p>
      </div>
    </div>

    <el-form class="instruction-filters" label-position="top">
      <el-form-item label="搜索">
        <el-input
          v-model="localFilters.search"
          clearable
          placeholder="搜索名称、指令正文、内容类型或指令类型"
          @keyup.enter="emit('search')"
        />
      </el-form-item>
      <el-form-item label="指令类型">
        <el-select
          v-model="localFilters.instructionType"
          clearable
          filterable
          allow-create
          placeholder="全部类型"
        >
          <el-option
            v-for="option in instructionTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="内容类型">
        <el-select
          v-model="localFilters.contentType"
          clearable
          filterable
          allow-create
          placeholder="全部内容"
        >
          <el-option
            v-for="option in contentTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="showAdvancedFilters" label="适用提示词类型">
        <el-select v-model="localFilters.targetPromptType" clearable placeholder="全部提示词类型">
          <el-option
            v-for="option in targetPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value as GeoPromptType"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="showAdvancedFilters" label="适用模型">
        <el-select
          v-model="localFilters.targetModel"
          clearable
          filterable
          allow-create
          placeholder="豆包 / 通义千问 / Kimi"
        >
          <el-option
            v-for="option in targetModelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="showAdvancedFilters" label="创建人">
        <el-input v-model="localFilters.createdBy" clearable placeholder="输入创建人标识" />
      </el-form-item>
      <div v-if="showAdvancedFilters" class="instruction-filter-note">
        高级筛选仅用于缩小当前指令模板范围。
      </div>
    </el-form>

    <div class="instruction-actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
      <el-button text @click="showAdvancedFilters = !showAdvancedFilters">
        {{ showAdvancedFilters ? "收起高级筛选" : "高级筛选" }}
      </el-button>
    </div>
  </section>
</template>

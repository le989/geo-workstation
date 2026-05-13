<script setup lang="ts">
import { reactive, watch } from "vue";
import type { InstructionTemplateQuery } from "@/api/instructions";
import type { GeoPromptType } from "@/api/geo-prompts";
import {
  contentTypeOptions,
  instructionTypeOptions,
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
        <p class="section-kicker">指令资产</p>
        <h2>指令模板筛选</h2>
        <p>按 GEO 内容生产方法、内容类型、适用提示词类型和模型筛选可复用指令。</p>
      </div>
      <el-button type="primary" @click="emit('create')">新建指令模板</el-button>
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
      <el-form-item label="适用提示词类型">
        <el-select v-model="localFilters.targetPromptType" clearable placeholder="全部提示词类型">
          <el-option
            v-for="option in targetPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value as GeoPromptType"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="适用模型">
        <el-input v-model="localFilters.targetModel" clearable placeholder="例如 deepseek-chat" />
      </el-form-item>
      <el-form-item label="创建人">
        <el-input v-model="localFilters.createdBy" clearable placeholder="创建人 ID" />
      </el-form-item>
    </el-form>

    <div class="instruction-actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
      <el-button type="success" @click="emit('create')">新建指令</el-button>
    </div>
  </section>
</template>

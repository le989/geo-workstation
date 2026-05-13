<script setup lang="ts">
import type { ModelInclusionRecordQuery } from "@/api/model-inclusion";
import { geoPromptTypeOptions, userIntentOptions } from "@/config/geo-prompt-options";
import { booleanFilterOptions, recordMethodOptions } from "@/config/model-inclusion-options";

const props = defineProps<{
  modelValue: ModelInclusionRecordQuery;
  loading?: boolean;
  exporting?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ModelInclusionRecordQuery];
  search: [];
  reset: [];
  export: [];
}>();

const updateField = <K extends keyof ModelInclusionRecordQuery>(
  key: K,
  value: ModelInclusionRecordQuery[K]
) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value
  });
};
</script>

<template>
  <el-card class="model-filter-card" shadow="never">
    <el-form class="model-inclusion-filters" label-position="top">
      <el-form-item label="搜索">
        <el-input
          :model-value="modelValue.search"
          clearable
          placeholder="搜索 answerSummary / model / competitors"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('search', $event)"
        />
      </el-form-item>
      <el-form-item label="GEO 提示词 ID">
        <el-input
          :model-value="modelValue.geoPromptId"
          clearable
          placeholder="按 geoPromptId 精准筛选"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('geoPromptId', $event)"
        />
      </el-form-item>
      <el-form-item label="AI 模型">
        <el-input
          :model-value="modelValue.model"
          clearable
          placeholder="例如 deepseek / kimi"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('model', $event)"
        />
      </el-form-item>
      <el-form-item label="产品线">
        <el-input
          :model-value="modelValue.productLine"
          clearable
          placeholder="产品线"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('productLine', $event)"
        />
      </el-form-item>
      <el-form-item label="提示词类型">
        <el-select
          :model-value="modelValue.promptType"
          clearable
          placeholder="全部类型"
          @update:model-value="updateField('promptType', $event)"
        >
          <el-option
            v-for="option in geoPromptTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="用户意图">
        <el-select
          :model-value="modelValue.userIntent"
          clearable
          placeholder="全部意图"
          @update:model-value="updateField('userIntent', $event)"
        >
          <el-option
            v-for="option in userIntentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌提及">
        <el-select
          :model-value="modelValue.brandMentioned"
          clearable
          placeholder="全部"
          @update:model-value="updateField('brandMentioned', $event)"
        >
          <el-option
            v-for="option in booleanFilterOptions"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌推荐">
        <el-select
          :model-value="modelValue.brandRecommended"
          clearable
          placeholder="全部"
          @update:model-value="updateField('brandRecommended', $event)"
        >
          <el-option
            v-for="option in booleanFilterOptions"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="官网引用">
        <el-select
          :model-value="modelValue.citedOfficialSite"
          clearable
          placeholder="全部"
          @update:model-value="updateField('citedOfficialSite', $event)"
        >
          <el-option
            v-for="option in booleanFilterOptions"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="记录方式">
        <el-select
          :model-value="modelValue.recordMethod"
          clearable
          placeholder="全部方式"
          @update:model-value="updateField('recordMethod', $event)"
        >
          <el-option
            v-for="option in recordMethodOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="查询时间从">
        <el-date-picker
          :model-value="modelValue.checkedFrom"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          placeholder="开始时间"
          @update:model-value="updateField('checkedFrom', $event)"
        />
      </el-form-item>
      <el-form-item label="查询时间到">
        <el-date-picker
          :model-value="modelValue.checkedTo"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          placeholder="结束时间"
          @update:model-value="updateField('checkedTo', $event)"
        />
      </el-form-item>
      <div class="filter-actions">
        <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
        <el-button :loading="exporting" @click="emit('export')">导出 CSV</el-button>
      </div>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { ReportQuery } from "@/api/reports";
import { booleanFilterOptions, entryPointOptions } from "@/config/model-inclusion-options";

const props = defineProps<{
  modelValue: ReportQuery;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ReportQuery];
  refresh: [];
  reset: [];
}>();

const updateField = <K extends keyof ReportQuery>(key: K, value: ReportQuery[K]) => {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value
  });
};
</script>

<template>
  <el-card class="report-filter-card" shadow="never">
    <el-form class="report-filters" label-position="top">
      <el-form-item label="产品线">
        <el-input
          :model-value="modelValue.productLine"
          clearable
          placeholder="按产品线聚焦 GEO 资产"
          @keyup.enter="emit('refresh')"
          @update:model-value="updateField('productLine', $event)"
        />
      </el-form-item>
      <el-form-item label="AI 模型">
        <el-input
          :model-value="modelValue.model"
          clearable
          placeholder="例如 deepseek / kimi"
          @keyup.enter="emit('refresh')"
          @update:model-value="updateField('model', $event)"
        />
      </el-form-item>
      <el-form-item label="平台">
        <el-input
          :model-value="modelValue.platform"
          clearable
          placeholder="例如 DeepSeek / Kimi / 通义"
          @keyup.enter="emit('refresh')"
          @update:model-value="updateField('platform', $event)"
        />
      </el-form-item>
      <el-form-item label="入口">
        <el-select
          :model-value="modelValue.entryPoint"
          clearable
          placeholder="全部入口"
          @update:model-value="updateField('entryPoint', $event)"
        >
          <el-option
            v-for="option in entryPointOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select
          :model-value="modelValue.priority"
          clearable
          placeholder="全部优先级"
          @update:model-value="updateField('priority', $event)"
        >
          <el-option
            v-for="priority in 5"
            :key="priority"
            :label="`P${priority}`"
            :value="priority"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="是否追踪">
        <el-select
          :model-value="modelValue.trackEnabled"
          clearable
          placeholder="全部"
          @update:model-value="updateField('trackEnabled', $event)"
        >
          <el-option
            v-for="option in booleanFilterOptions"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="只看最新结果">
        <el-switch
          :model-value="modelValue.latestOnly ?? true"
          active-text="是"
          inactive-text="否"
          inline-prompt
          @update:model-value="updateField('latestOnly', $event)"
        />
      </el-form-item>
      <el-form-item label="时间从">
        <el-date-picker
          :model-value="modelValue.from"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          placeholder="开始时间"
          @update:model-value="updateField('from', $event)"
        />
      </el-form-item>
      <el-form-item label="时间到">
        <el-date-picker
          :model-value="modelValue.to"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          placeholder="结束时间"
          @update:model-value="updateField('to', $event)"
        />
      </el-form-item>
      <div class="report-filter-actions">
        <el-button type="primary" :loading="loading" @click="emit('refresh')">
          刷新当前报表
        </el-button>
        <el-button @click="emit('reset')">重置</el-button>
      </div>
    </el-form>
  </el-card>
</template>

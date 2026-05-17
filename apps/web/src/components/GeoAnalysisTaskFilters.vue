<script setup lang="ts">
import type { GeoAnalysisTaskQuery } from "@/api/geo-analysis";
import { geoAnalysisStatusOptions } from "@/config/geo-analysis-options";

defineProps<{
  modelValue: GeoAnalysisTaskQuery;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: GeoAnalysisTaskQuery];
  search: [];
  reset: [];
}>();

const setField = <K extends keyof GeoAnalysisTaskQuery>(
  current: GeoAnalysisTaskQuery,
  key: K,
  value: GeoAnalysisTaskQuery[K]
) => {
  emit("update:modelValue", {
    ...current,
    [key]: value
  });
};

const setDateRange = (current: GeoAnalysisTaskQuery, value?: [string, string]) => {
  emit("update:modelValue", {
    ...current,
    createdFrom: value?.[0],
    createdTo: value?.[1]
  });
};
</script>

<template>
  <section class="geo-analysis-filter-panel">
    <div class="geo-analysis-filter-header">
      <p class="section-kicker">筛选记录</p>
      <h2>定位诊断任务</h2>
    </div>
    <el-form class="geo-analysis-filters" label-position="top">
      <el-form-item label="搜索">
        <el-input
          :model-value="modelValue.search"
          clearable
          placeholder="任务名称 / 品牌 / 官网 / 产品线"
          @update:model-value="setField(modelValue, 'search', $event)"
          @keyup.enter="emit('search')"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          :model-value="modelValue.status"
          clearable
          placeholder="全部状态"
          @update:model-value="setField(modelValue, 'status', $event)"
        >
          <el-option
            v-for="option in geoAnalysisStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品线">
        <el-input
          :model-value="modelValue.productLine"
          clearable
          placeholder="例如：核心产品、服务、课程或门店项目"
          @update:model-value="setField(modelValue, 'productLine', $event)"
        />
      </el-form-item>
      <el-form-item label="目标模型">
        <el-input
          :model-value="modelValue.targetModel"
          clearable
          placeholder="例如 豆包 / 通义千问 / Kimi"
          @update:model-value="setField(modelValue, 'targetModel', $event)"
        />
      </el-form-item>
      <el-form-item label="创建时间">
        <el-date-picker
          :model-value="
            modelValue.createdFrom || modelValue.createdTo
              ? [modelValue.createdFrom, modelValue.createdTo]
              : undefined
          "
          type="daterange"
          unlink-panels
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @update:model-value="setDateRange(modelValue, $event)"
        />
      </el-form-item>
    </el-form>

    <div class="geo-analysis-filter-actions">
      <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </div>
  </section>
</template>

<style scoped>
.geo-analysis-filter-header {
  margin-bottom: 14px;
}

.geo-analysis-filter-header h2 {
  margin: 4px 0 0;
  color: #13243a;
  font-size: 20px;
}
</style>

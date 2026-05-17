<script setup lang="ts">
import { ref } from "vue";
import type { ModelInclusionRecordQuery } from "@/api/model-inclusion";
import { geoPromptTypeOptions, userIntentOptions } from "@/config/geo-prompt-options";
import {
  booleanFilterOptions,
  detectionMethodOptions,
  deviceTypeOptions,
  enabledMonitoringModelOptions,
  entryPointOptions,
  hitLevelOptions,
  recordMethodOptions
} from "@/config/model-inclusion-options";

const props = defineProps<{
  modelValue: ModelInclusionRecordQuery;
  loading?: boolean;
  exporting?: boolean;
  canExport?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ModelInclusionRecordQuery];
  search: [];
  reset: [];
  export: [];
}>();

const showAdvancedFilters = ref(false);

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
    <div class="model-filter-header">
      <div>
        <p class="section-kicker">记录筛选</p>
        <h2>按风险和平台快速定位</h2>
      </div>
      <span>常用筛选默认展示，入口、设备、记录方式等低频字段放入更多筛选。</span>
    </div>

    <el-form class="model-inclusion-filters model-inclusion-filters--primary" label-position="top">
      <el-form-item label="搜索提示词 / 回答">
        <el-input
          :model-value="modelValue.search"
          clearable
          placeholder="搜索提示词、回答摘要、模型或竞品"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('search', $event)"
        />
      </el-form-item>
      <el-form-item label="AI 模型">
        <el-select
          :model-value="modelValue.model"
          clearable
          placeholder="全部启用模型"
          @update:model-value="updateField('model', $event)"
        >
          <el-option
            v-for="option in enabledMonitoringModelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          >
            <div class="model-select-option">
              <strong>{{ option.label }}</strong>
              <span>{{ option.platform }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="平台">
        <el-input
          :model-value="modelValue.platform"
          clearable
          placeholder="例如 Kimi / 通义"
          @keyup.enter="emit('search')"
          @update:model-value="updateField('platform', $event)"
        />
      </el-form-item>
      <el-form-item label="命中状态">
        <el-select
          :model-value="modelValue.hitLevel"
          clearable
          placeholder="全部状态"
          @update:model-value="updateField('hitLevel', $event)"
        >
          <el-option
            v-for="option in hitLevelOptions"
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
      <div class="model-filter-actions">
        <el-button type="primary" :loading="loading" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
        <el-button v-if="canExport !== false" :loading="exporting" @click="emit('export')">
          导出当前范围
        </el-button>
        <el-button text @click="showAdvancedFilters = !showAdvancedFilters">
          {{ showAdvancedFilters ? "收起筛选" : "更多筛选" }}
        </el-button>
      </div>
    </el-form>

    <el-collapse-transition>
      <div v-show="showAdvancedFilters" class="model-filter-advanced">
        <el-divider content-position="left">更多筛选</el-divider>
        <el-form
          class="model-inclusion-filters model-inclusion-filters--advanced"
          label-position="top"
        >
          <el-form-item label="GEO 提示词 ID">
            <el-input
              :model-value="modelValue.geoPromptId"
              clearable
              placeholder="按 GEO 提示词 ID 精准筛选"
              @keyup.enter="emit('search')"
              @update:model-value="updateField('geoPromptId', $event)"
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
          <el-form-item label="检测方式">
            <el-select
              :model-value="modelValue.detectionMethod"
              clearable
              placeholder="全部方式"
              @update:model-value="updateField('detectionMethod', $event)"
            >
              <el-option
                v-for="option in detectionMethodOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="设备类型">
            <el-select
              :model-value="modelValue.deviceType"
              clearable
              placeholder="全部设备"
              @update:model-value="updateField('deviceType', $event)"
            >
              <el-option
                v-for="option in deviceTypeOptions"
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
          <el-form-item label="引用内容资产">
            <el-select
              :model-value="modelValue.citedContentAsset"
              clearable
              placeholder="全部"
              @update:model-value="updateField('citedContentAsset', $event)"
            >
              <el-option
                v-for="option in booleanFilterOptions"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="出现竞品">
            <el-select
              :model-value="modelValue.competitorMentioned"
              clearable
              placeholder="全部"
              @update:model-value="updateField('competitorMentioned', $event)"
            >
              <el-option
                v-for="option in booleanFilterOptions"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="是否联网">
            <el-select
              :model-value="modelValue.isWebSearchEnabled"
              clearable
              placeholder="全部"
              @update:model-value="updateField('isWebSearchEnabled', $event)"
            >
              <el-option
                v-for="option in booleanFilterOptions"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="是否登录">
            <el-select
              :model-value="modelValue.isLoggedIn"
              clearable
              placeholder="全部"
              @update:model-value="updateField('isLoggedIn', $event)"
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
        </el-form>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

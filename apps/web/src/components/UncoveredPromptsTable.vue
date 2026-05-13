<script setup lang="ts">
import type { UncoveredPrompt } from "@/api/model-inclusion";
import GeoPromptStatusTag from "@/components/GeoPromptStatusTag.vue";
import GeoPromptTypeTag from "@/components/GeoPromptTypeTag.vue";
import { formatOptional, userIntentLabelMap } from "@/config/geo-prompt-options";

defineProps<{
  prompts: UncoveredPrompt[];
  loading?: boolean;
}>();

const getUserIntentLabel = (prompt: UncoveredPrompt) =>
  userIntentLabelMap[prompt.userIntent] ?? prompt.userIntent;
</script>

<template>
  <el-table
    v-loading="loading"
    :data="prompts"
    border
    row-key="geoPromptId"
    empty-text="暂无未覆盖提示词"
    class="uncovered-prompt-table"
  >
    <el-table-column label="待检测 / 待补内容提示词" min-width="300" fixed>
      <template #default="{ row }">
        <strong>{{ row.promptText }}</strong>
        <p class="table-subtext">这些提示词在当前筛选条件下暂无模型覆盖记录。</p>
      </template>
    </el-table-column>
    <el-table-column label="类型" width="100">
      <template #default="{ row }">
        <GeoPromptTypeTag :type="row.type" />
      </template>
    </el-table-column>
    <el-table-column label="产品线" width="160">
      <template #default="{ row }">{{ formatOptional(row.productLine) }}</template>
    </el-table-column>
    <el-table-column label="用户意图" width="130">
      <template #default="{ row }">
        {{ getUserIntentLabel(row) }}
      </template>
    </el-table-column>
    <el-table-column label="优先级" width="90" prop="priority" />
    <el-table-column label="追踪" width="90">
      <template #default="{ row }">
        <el-tag :type="row.trackEnabled ? 'success' : 'info'" effect="plain">
          {{ row.trackEnabled ? "追踪" : "不追踪" }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="最新覆盖状态" width="150">
      <template #default="{ row }">
        <GeoPromptStatusTag :status="row.latestCoverageStatus || 'unknown'" />
      </template>
    </el-table-column>
  </el-table>
</template>

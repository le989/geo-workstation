<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import {
  getOperationLogs,
  type OperationLog,
  type OperationLogQuery
} from "@/api/usage";
import AppErrorState from "@/components/AppErrorState.vue";

type DateRangeValue = [string, string] | null;

const moduleOptions = [
  { label: "全部模块", value: "" },
  { label: "登录", value: "dashboard" },
  { label: "部门管理", value: "departments" },
  { label: "知识库", value: "knowledge-bases" },
  { label: "售后问答", value: "aftersales-qa" },
  { label: "GEO 内容生成", value: "geo-content" },
  { label: "AI 拓词", value: "expansion" },
  { label: "AI 模型覆盖记录", value: "model-inclusion-records" },
  { label: "GEO 报表", value: "geo-reports" }
];

const actionOptions = [
  { label: "全部动作", value: "" },
  { label: "登录", value: "login" },
  { label: "新增", value: "create" },
  { label: "编辑", value: "update" },
  { label: "启停状态", value: "status" },
  { label: "保存权限", value: "save_permissions" },
  { label: "上传资料", value: "upload" },
  { label: "手动录入", value: "manual_create" },
  { label: "更新资料元信息", value: "metadata_update" },
  { label: "编辑片段", value: "chunk_update" },
  { label: "AI 问答", value: "ai_question" },
  { label: "AI 生成", value: "ai_generate" },
  { label: "保存候选词", value: "save_candidates" },
  { label: "重试", value: "retry" },
  { label: "模型覆盖检测", value: "web_search_check" },
  { label: "导出", value: "export" }
];

const moduleLabelMap = Object.fromEntries(moduleOptions.map((item) => [item.value, item.label]));
const actionLabelMap = Object.fromEntries(actionOptions.map((item) => [item.value, item.label]));

const filters = reactive({
  moduleKey: "",
  action: "",
  success: "all" as "all" | "success" | "failure",
  page: 1,
  pageSize: 20
});
const dateRange = ref<DateRangeValue>(null);
const loading = ref(false);
const errorMessage = ref("");
const logs = ref<OperationLog[]>([]);
const total = ref(0);

const getModuleLabel = (moduleKey: string) => moduleLabelMap[moduleKey] ?? moduleKey;
const getActionLabel = (action: string) => actionLabelMap[action] ?? action;

const buildQuery = (): OperationLogQuery => ({
  moduleKey: filters.moduleKey || undefined,
  action: filters.action || undefined,
  success:
    filters.success === "all"
      ? undefined
      : filters.success === "success"
        ? true
        : false,
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1],
  page: filters.page,
  pageSize: filters.pageSize
});

const formatTime = (value: string) => new Date(value).toLocaleString("zh-CN");

const formatTarget = (row: OperationLog) =>
  row.targetTitle ?? row.targetId ?? row.targetType;

const formatMetadata = (metadata: unknown) => {
  if (!metadata) {
    return "-";
  }

  const text = JSON.stringify(metadata);
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
};

const loadLogs = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getOperationLogs(buildQuery());
    logs.value = result.items;
    total.value = result.total;
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作日志加载失败";
    errorMessage.value = message;
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  filters.page = 1;
  void loadLogs();
};

watch(
  () => filters.pageSize,
  () => {
    filters.page = 1;
    void loadLogs();
  }
);

onMounted(() => {
  void loadLogs();
});
</script>

<template>
  <section class="operation-log-page">
    <div class="toolbar-row">
      <el-form inline>
        <el-form-item label="模块">
          <el-select v-model="filters.moduleKey" class="toolbar-control">
            <el-option
              v-for="item in moduleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="动作">
          <el-select v-model="filters.action" class="toolbar-control">
            <el-option
              v-for="item in actionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="filters.success" class="status-control">
            <el-option label="全部" value="all" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failure" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="date-control"
          />
        </el-form-item>
      </el-form>
      <div class="toolbar-actions">
        <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadLogs">刷新</el-button>
      </div>
    </div>

    <AppErrorState v-if="errorMessage" :message="errorMessage" @retry="loadLogs" />

    <template v-else>
      <el-table :data="logs" :loading="loading" border>
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">{{ row.userName ?? row.userId ?? "系统" }}</template>
        </el-table-column>
        <el-table-column label="部门" min-width="140">
          <template #default="{ row }">{{ row.departmentName ?? row.departmentId ?? "-" }}</template>
        </el-table-column>
        <el-table-column label="模块" min-width="150">
          <template #default="{ row }">{{ getModuleLabel(row.moduleKey) }}</template>
        </el-table-column>
        <el-table-column label="动作" min-width="150">
          <template #default="{ row }">{{ getActionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column label="对象" min-width="180">
          <template #default="{ row }">{{ formatTarget(row) }}</template>
        </el-table-column>
        <el-table-column label="结果" width="110">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" effect="plain">
              {{ row.success ? "成功" : "失败" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误摘要" min-width="180">
          <template #default="{ row }">{{ row.errorMessage ?? "-" }}</template>
        </el-table-column>
        <el-table-column label="元信息" min-width="240">
          <template #default="{ row }">{{ formatMetadata(row.metadata) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @current-change="loadLogs"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.operation-log-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar-control {
  width: 180px;
}

.status-control {
  width: 120px;
}

.date-control {
  width: 280px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .toolbar-row {
    flex-direction: column;
  }

  .toolbar-control,
  .status-control,
  .date-control {
    width: 100%;
  }
}
</style>

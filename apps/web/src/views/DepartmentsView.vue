<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { GeoModuleKey } from "@geo-workstation/shared";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Plus, Setting, Switch } from "@element-plus/icons-vue";
import {
  createDepartment,
  getDepartmentModulePermissions,
  listDepartments,
  saveDepartmentModulePermissions,
  updateDepartment,
  updateDepartmentStatus,
  type Department,
  type DepartmentStatus
} from "@/api/departments";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import AppLoadingState from "@/components/AppLoadingState.vue";
import { formatDateTime } from "@/config/geo-prompt-options";
import { GEO_MODULE_OPTIONS } from "@/config/module-permissions";

type DepartmentFormState = {
  name: string;
  code: string;
};

const departments = ref<Department[]>([]);
const loading = ref(false);
const submitting = ref(false);
const permissionsLoading = ref(false);
const tableError = ref("");
const formError = ref("");
const permissionsError = ref("");
const dialogVisible = ref(false);
const permissionsDialogVisible = ref(false);
const editingDepartment = ref<Department | null>(null);
const selectedDepartment = ref<Department | null>(null);
const selectedModuleKeys = ref<GeoModuleKey[]>([]);

const form = reactive<DepartmentFormState>({
  name: "",
  code: ""
});

const moduleGroups = computed(() => {
  const groups = new Map<string, Array<(typeof GEO_MODULE_OPTIONS)[number]>>();

  GEO_MODULE_OPTIONS.forEach((module) => {
    groups.set(module.group, [...(groups.get(module.group) ?? []), module]);
  });

  return Array.from(groups.entries()).map(([group, modules]) => ({ group, modules }));
});

const isEmpty = computed(() => !loading.value && departments.value.length === 0);
const dialogTitle = computed(() => (editingDepartment.value ? "编辑部门" : "新增部门"));

const statusLabel = (status: DepartmentStatus) => (status === "active" ? "启用" : "停用");
const statusTagType = (status: DepartmentStatus) => (status === "active" ? "success" : "info");

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "请求失败，请稍后重试。";

const resetForm = () => {
  form.name = "";
  form.code = "";
  formError.value = "";
  editingDepartment.value = null;
};

const loadDepartments = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await listDepartments();
    departments.value = result.items;
  } catch (error) {
    tableError.value = getErrorMessage(error);
    departments.value = [];
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  resetForm();
  dialogVisible.value = true;
};

const openEditDialog = (department: Department) => {
  editingDepartment.value = department;
  form.name = department.name;
  form.code = department.code;
  formError.value = "";
  dialogVisible.value = true;
};

const submitDepartment = async () => {
  formError.value = "";

  if (!form.name.trim() || !form.code.trim()) {
    formError.value = "部门名称和编码不能为空。";
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim()
    };

    if (editingDepartment.value) {
      await updateDepartment(editingDepartment.value.id, payload);
      ElMessage.success("部门已更新");
    } else {
      await createDepartment(payload);
      ElMessage.success("部门已新增");
    }

    dialogVisible.value = false;
    await loadDepartments();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
};

const toggleDepartmentStatus = async (department: Department) => {
  const nextStatus: DepartmentStatus = department.status === "active" ? "inactive" : "active";
  const actionText = nextStatus === "inactive" ? "停用" : "启用";

  try {
    if (nextStatus === "inactive") {
      await ElMessageBox.confirm(
        `确认停用部门 ${department.name} 吗？部门成员将按无部门策略处理。`,
        "停用部门",
        {
          cancelButtonText: "取消",
          confirmButtonText: "停用",
          type: "warning"
        }
      );
    }

    await updateDepartmentStatus(department.id, nextStatus);
    ElMessage.success(`部门已${actionText}`);
    await loadDepartments();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(getErrorMessage(error));
    }
  }
};

const openPermissionsDialog = async (department: Department) => {
  selectedDepartment.value = department;
  permissionsDialogVisible.value = true;
  permissionsLoading.value = true;
  permissionsError.value = "";
  selectedModuleKeys.value = [];

  try {
    const result = await getDepartmentModulePermissions(department.id);
    selectedModuleKeys.value = result.permissions
      .filter((permission) => permission.canAccess)
      .map((permission) => permission.moduleKey);
  } catch (error) {
    permissionsError.value = getErrorMessage(error);
  } finally {
    permissionsLoading.value = false;
  }
};

const submitPermissions = async () => {
  if (!selectedDepartment.value) {
    return;
  }

  submitting.value = true;
  permissionsError.value = "";

  try {
    const selected = new Set(selectedModuleKeys.value);
    const result = await saveDepartmentModulePermissions(selectedDepartment.value.id, {
      permissions: GEO_MODULE_OPTIONS.map((module) => ({
        moduleKey: module.key,
        canAccess: selected.has(module.key)
      }))
    });
    selectedModuleKeys.value = result.permissions
      .filter((permission) => permission.canAccess)
      .map((permission) => permission.moduleKey);
    permissionsDialogVisible.value = false;
    ElMessage.success("模块权限已保存");
  } catch (error) {
    permissionsError.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  void loadDepartments();
});
</script>

<template>
  <section class="departments-page">
    <header class="departments-page__heading">
      <div>
        <el-tag class="departments-page__scope-tag" effect="plain" type="primary">部门权限</el-tag>
        <h1>部门管理</h1>
        <p>维护部门，并控制部门成员能进入哪些 GEO 模块。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增部门</el-button>
    </header>

    <AppErrorState v-if="tableError" title="部门列表加载失败" :message="tableError" />
    <AppLoadingState v-else-if="loading" title="正在加载部门列表" />

    <section v-else class="departments-table-panel">
      <el-table v-if="departments.length" :data="departments" row-key="id" class="departments-table" border>
        <el-table-column prop="name" label="部门名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="code" label="部门编码" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }: { row: Department }">
            <el-tag :type="statusTagType(row.status)" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }: { row: Department }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="320"
          fixed="right"
          class-name="departments-table__actions-column"
        >
          <template #default="{ row }: { row: Department }">
            <div class="departments-table__actions">
              <el-button size="small" :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
              <el-button size="small" :icon="Setting" @click="openPermissionsDialog(row)">
                模块权限
              </el-button>
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                :icon="Switch"
                plain
                @click="toggleDepartmentStatus(row)"
              >
                {{ row.status === "active" ? "停用" : "启用" }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <AppEmptyState v-else-if="isEmpty" title="暂无部门" description="可以先新增一个部门。" />
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" @closed="resetForm">
      <el-alert
        v-if="formError"
        :title="formError"
        type="error"
        :closable="false"
        show-icon
        class="departments-dialog-alert"
      />
      <el-form label-position="top" class="departments-dialog-form">
        <el-form-item label="部门名称">
          <el-input v-model="form.name" autocomplete="off" />
        </el-form-item>
        <el-form-item label="部门编码">
          <el-input v-model="form.code" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDepartment">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="permissionsDialogVisible"
      :title="`模块权限：${selectedDepartment?.name ?? ''}`"
      width="760px"
    >
      <AppLoadingState v-if="permissionsLoading" title="正在加载模块权限" />
      <template v-else>
        <el-alert
          v-if="permissionsError"
          :title="permissionsError"
          type="error"
          :closable="false"
          show-icon
          class="departments-dialog-alert"
        />
        <el-checkbox-group v-model="selectedModuleKeys" class="module-permission-groups">
          <section v-for="group in moduleGroups" :key="group.group" class="module-permission-group">
            <h3>{{ group.group }}</h3>
            <div class="module-permission-grid">
              <el-checkbox
                v-for="module in group.modules"
                :key="module.key"
                :label="module.key"
                border
              >
                {{ module.label }}
              </el-checkbox>
            </div>
          </section>
        </el-checkbox-group>
      </template>
      <template #footer>
        <el-button @click="permissionsDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="permissionsLoading"
          @click="submitPermissions"
        >
          保存权限
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.departments-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.departments-page__heading,
.departments-table-panel {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.departments-page__heading {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  overflow: hidden;
  padding: 18px 20px;
}

.departments-page__heading::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #2563eb, #0891b2);
  content: "";
}

.departments-page__scope-tag {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.departments-page__heading h1 {
  margin: 8px 0 6px;
  font-size: 22px;
  line-height: 1.2;
  color: #172331;
}

.departments-page__heading p {
  margin: 0;
  color: #667586;
}

.departments-table-panel {
  overflow: hidden;
  padding: 14px;
}

.departments-table {
  --el-table-fixed-right-column: inset -1px 0 0 #dbe5ef;
}

.departments-table :deep(.el-table__fixed-right::before) {
  background: #dbe5ef;
  box-shadow: -4px 0 10px rgb(15 23 42 / 3%);
}

.departments-table :deep(.departments-table__actions-column) {
  background: #ffffff;
}

.departments-table__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.departments-table__actions :deep(.el-button) {
  margin-left: 0;
  border-color: #dbe5ef;
  background: #ffffff;
}

.departments-table__actions :deep(.el-button--warning.is-plain) {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9c6b25;
}

.departments-dialog-alert {
  margin-bottom: 12px;
}

.departments-dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.module-permission-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-permission-group {
  border: 1px solid #dbe5ef;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.module-permission-group h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #172331;
}

.module-permission-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.module-permission-grid :deep(.el-checkbox) {
  width: 100%;
  height: 40px;
  margin: 0;
}

@media (max-width: 760px) {
  .departments-page__heading {
    flex-direction: column;
  }

  .departments-dialog-form,
  .module-permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>

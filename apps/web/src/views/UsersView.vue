<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUserMembership,
  updateUserStatus,
  type CreateUserPayload,
  type ManagedUser,
  type MembershipRole,
  type MembershipStatus,
  type UserMembership,
  type UserStatus
} from "@/api/users";
import { listDepartments, type Department } from "@/api/departments";
import AppEmptyState from "@/components/AppEmptyState.vue";
import AppErrorState from "@/components/AppErrorState.vue";
import AppLoadingState from "@/components/AppLoadingState.vue";
import { formatDateTime } from "@/config/geo-prompt-options";
import { useAuthStore } from "@/stores/auth";
import { getRoleLabel } from "@/utils/permission";

type UserFilterState = {
  keyword: string;
  role: MembershipRole | "";
  status: UserStatus | "";
  companyId: string;
};

type CreateUserFormState = {
  name: string;
  email: string;
  initialPassword: string;
  role: MembershipRole;
  companyId: string;
  departmentId: string;
  membershipRole: MembershipRole;
  status: UserStatus;
};

type ResetPasswordFormState = {
  newPassword: string;
  confirmPassword: string;
};

type EditMembershipFormState = {
  companyId: string;
  departmentId: string;
  membershipRole: MembershipRole;
  membershipStatus: MembershipStatus;
  isDefault: boolean;
  status: UserStatus;
};

const authStore = useAuthStore();
const users = ref<ManagedUser[]>([]);
const departmentsByCompany = ref<Record<string, Department[]>>({});
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const tableError = ref("");
const submitting = ref(false);

const createDialogVisible = ref(false);
const resetDialogVisible = ref(false);
const editDialogVisible = ref(false);
const selectedUser = ref<ManagedUser | null>(null);
const createFormError = ref("");
const resetFormError = ref("");
const editFormError = ref("");

const filters = reactive<UserFilterState>({
  keyword: "",
  role: "",
  status: "",
  companyId: ""
});

const createForm = reactive<CreateUserFormState>({
  name: "",
  email: "",
  initialPassword: "",
  role: "operator",
  companyId: "",
  departmentId: "",
  membershipRole: "operator",
  status: "active"
});

const resetForm = reactive<ResetPasswordFormState>({
  newPassword: "",
  confirmPassword: ""
});

const editForm = reactive<EditMembershipFormState>({
  companyId: "",
  departmentId: "",
  membershipRole: "operator",
  membershipStatus: "active",
  isDefault: true,
  status: "active"
});

const roleOptions: Array<{ label: string; value: MembershipRole }> = [
  { label: "平台管理员", value: "platform_admin" },
  { label: "公司管理员", value: "company_admin" },
  { label: "运营人员", value: "operator" },
  { label: "只读用户", value: "viewer" }
];

const statusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "disabled" }
];

const membershipStatusOptions: Array<{ label: string; value: MembershipStatus }> = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "disabled" }
];

const ordinaryRoleOptions = roleOptions.filter((role) =>
  ["operator", "viewer"].includes(role.value)
);

const currentRole = computed(() => authStore.currentRole);
const isCompanyAdmin = computed(() => currentRole.value === "company_admin");
const currentCompany = computed(() => authStore.currentCompany);
const currentCompanyId = computed(() => currentCompany.value?.id ?? "");
const visibleRoleOptions = computed(() =>
  isCompanyAdmin.value ? ordinaryRoleOptions : roleOptions
);
const filterRoleOptions = computed(() =>
  isCompanyAdmin.value ? ordinaryRoleOptions : roleOptions
);

const companyOptions = computed(() =>
  authStore.companies.map((company) => ({
    label: `${company.name} / ${company.code}`,
    value: company.id
  }))
);

const visibleCompanyOptions = computed(() =>
  isCompanyAdmin.value
    ? companyOptions.value.filter((company) => company.value === currentCompanyId.value)
    : companyOptions.value
);

const departmentOptionsForCompany = (companyId: string) => {
  if (isCompanyAdmin.value && companyId !== currentCompanyId.value) {
    return [];
  }

  return (departmentsByCompany.value[companyId] ?? [])
    .filter((department) => department.status === "active")
    .map((department) => ({
      label: `${department.name} / ${department.code}`,
      value: department.id
    }));
};

const createDepartmentOptions = computed(() => departmentOptionsForCompany(createForm.companyId));
const editDepartmentOptions = computed(() => departmentOptionsForCompany(editForm.companyId));

const isEmpty = computed(() => !loading.value && users.value.length === 0);

const getDefaultMembership = (user: ManagedUser): UserMembership | undefined =>
  user.memberships.find((membership) => membership.isDefault) ?? user.memberships[0];

const formatDepartment = (membership?: UserMembership) =>
  membership?.departmentName
    ? `${membership.departmentName} / ${membership.departmentCode ?? "-"}`
    : "未绑定";

const statusLabel = (status?: UserStatus | MembershipStatus) =>
  status === "disabled" ? "禁用" : "启用";

const statusTagType = (status?: UserStatus | MembershipStatus) =>
  status === "disabled" ? "danger" : "success";

const trimOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "请求失败，请稍后重试。";

const buildQuery = () => ({
  companyId: isCompanyAdmin.value ? currentCompanyId.value : trimOptional(filters.companyId),
  keyword: trimOptional(filters.keyword),
  page: page.value,
  pageSize: pageSize.value,
  role: filters.role || undefined,
  status: filters.status || undefined
});

const loadUsers = async () => {
  loading.value = true;
  tableError.value = "";

  try {
    const result = await listUsers(buildQuery());
    users.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
  } catch (error) {
    tableError.value = getErrorMessage(error);
    users.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const loadDepartmentsForCompany = async (companyId: string) => {
  if (!companyId || departmentsByCompany.value[companyId]) {
    return;
  }

  if (isCompanyAdmin.value && companyId !== currentCompanyId.value) {
    return;
  }

  try {
    const result = await listDepartments(companyId);
    departmentsByCompany.value = {
      ...departmentsByCompany.value,
      [companyId]: result.items
    };
  } catch {
    departmentsByCompany.value = {
      ...departmentsByCompany.value,
      [companyId]: []
    };
  }
};

const resetCreateForm = () => {
  createForm.name = "";
  createForm.email = "";
  createForm.initialPassword = "";
  createForm.role = "operator";
  createForm.membershipRole = "operator";
  createForm.status = "active";
  createForm.companyId = currentCompanyId.value || authStore.companies[0]?.id || "";
  createForm.departmentId = "";
  void loadDepartmentsForCompany(createForm.companyId);
  createFormError.value = "";
};

const openCreateDialog = () => {
  resetCreateForm();
  createDialogVisible.value = true;
};

const validatePassword = (password: string, confirmPassword?: string) => {
  if (password.length < 8) {
    return "密码至少需要 8 位。";
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "两次输入的密码不一致。";
  }

  return "";
};

const submitCreateUser = async () => {
  createFormError.value = "";

  if (!createForm.name.trim() || !createForm.email.trim()) {
    createFormError.value = "姓名和邮箱不能为空。";
    return;
  }

  if (createForm.role !== createForm.membershipRole) {
    createFormError.value = "全局角色和公司角色需要保持一致。";
    return;
  }

  if (isCompanyAdmin.value && !["operator", "viewer"].includes(createForm.role)) {
    createFormError.value = "公司管理员只能创建运营人员或只读用户。";
    return;
  }

  const passwordError = validatePassword(createForm.initialPassword);
  if (passwordError) {
    createFormError.value = passwordError;
    return;
  }

  submitting.value = true;
  try {
    const payload: CreateUserPayload = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      initialPassword: createForm.initialPassword,
      role: createForm.role,
      companyId: isCompanyAdmin.value ? currentCompanyId.value : createForm.companyId,
      departmentId: trimOptional(createForm.departmentId) ?? null,
      membershipRole: isCompanyAdmin.value ? createForm.role : createForm.membershipRole,
      status: isCompanyAdmin.value ? "active" : createForm.status,
      isDefaultCompany: true
    };
    await createUser(payload);
    createForm.initialPassword = "";
    createDialogVisible.value = false;
    ElMessage.success("用户已创建");
    await loadUsers();
  } catch (error) {
    createFormError.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
};

const openResetPasswordDialog = (user: ManagedUser) => {
  const reason = getResetDisabledReason(user);
  if (reason) {
    ElMessage.warning(reason);
    return;
  }

  selectedUser.value = user;
  resetForm.newPassword = "";
  resetForm.confirmPassword = "";
  resetFormError.value = "";
  resetDialogVisible.value = true;
};

const submitResetPassword = async () => {
  if (!selectedUser.value) {
    return;
  }

  resetFormError.value = validatePassword(resetForm.newPassword, resetForm.confirmPassword);
  if (resetFormError.value) {
    return;
  }

  submitting.value = true;
  try {
    await ElMessageBox.confirm(
      `确认重置账号 ${selectedUser.value.email} 的密码吗？`,
      "重置密码",
      {
        cancelButtonText: "取消",
        confirmButtonText: "确认重置",
        type: "warning"
      }
    );
    await resetUserPassword(selectedUser.value.id, {
      newPassword: resetForm.newPassword
    });
    resetForm.newPassword = "";
    resetForm.confirmPassword = "";
    resetDialogVisible.value = false;
    ElMessage.success("密码已重置，请通过公司内安全流程通知用户。");
  } catch (error) {
    if (error !== "cancel") {
      resetFormError.value = getErrorMessage(error);
    }
  } finally {
    submitting.value = false;
  }
};

const openEditDialog = (user: ManagedUser) => {
  const reason = getEditDisabledReason(user);
  if (reason) {
    ElMessage.warning(reason);
    return;
  }

  const membership = getDefaultMembership(user);
  selectedUser.value = user;
  editForm.companyId = isCompanyAdmin.value
    ? currentCompanyId.value
    : (membership?.companyId ?? currentCompanyId.value);
  editForm.departmentId = membership?.departmentId ?? "";
  editForm.membershipRole = membership?.role ?? "operator";
  editForm.membershipStatus = membership?.status ?? "active";
  editForm.isDefault = membership?.isDefault ?? true;
  editForm.status = user.status;
  editFormError.value = "";
  void loadDepartmentsForCompany(editForm.companyId);
  editDialogVisible.value = true;
};

const submitEditUser = async () => {
  if (!selectedUser.value) {
    return;
  }

  editFormError.value = "";
  submitting.value = true;

  try {
    await updateUserMembership(selectedUser.value.id, {
      companyId: isCompanyAdmin.value ? currentCompanyId.value : editForm.companyId,
      departmentId: trimOptional(editForm.departmentId) ?? null,
      membershipRole: editForm.membershipRole,
      membershipStatus: isCompanyAdmin.value ? "active" : editForm.membershipStatus,
      isDefault: isCompanyAdmin.value ? true : editForm.isDefault
    });
    await updateUserStatus(selectedUser.value.id, {
      status: editForm.status
    });
    editDialogVisible.value = false;
    ElMessage.success("用户角色与状态已更新");
    await loadUsers();
  } catch (error) {
    editFormError.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
};

const toggleUserStatus = async (user: ManagedUser) => {
  const reason = getStatusDisabledReason(user);
  if (reason) {
    ElMessage.warning(reason);
    return;
  }

  const nextStatus: UserStatus = user.status === "active" ? "disabled" : "active";
  const actionText = nextStatus === "disabled" ? "禁用" : "启用";

  try {
    if (nextStatus === "disabled") {
      await ElMessageBox.confirm(
        `确认${actionText}账号 ${user.email} 吗？`,
        `${actionText}用户`,
        {
          cancelButtonText: "取消",
          confirmButtonText: actionText,
          type: "warning"
        }
      );
    }

    await updateUserStatus(user.id, { status: nextStatus });
    ElMessage.success(`用户已${actionText}`);
    await loadUsers();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(getErrorMessage(error));
    }
  }
};

const handleSearch = () => {
  page.value = 1;
  void loadUsers();
};

const handleResetFilters = () => {
  filters.keyword = "";
  filters.role = "";
  filters.status = "";
  filters.companyId = isCompanyAdmin.value ? currentCompanyId.value : "";
  page.value = 1;
  void loadUsers();
};

const handlePageChange = (nextPage: number) => {
  page.value = nextPage;
  void loadUsers();
};

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadUsers();
};

onMounted(() => {
  if (isCompanyAdmin.value) {
    filters.companyId = currentCompanyId.value;
  }
  void loadUsers();
  void loadDepartmentsForCompany(currentCompanyId.value);
});

watch(
  () => createForm.companyId,
  (companyId) => {
    createForm.departmentId = "";
    void loadDepartmentsForCompany(companyId);
  },
  { flush: "sync" }
);

watch(
  () => createForm.role,
  (role) => {
    if (isCompanyAdmin.value) {
      createForm.membershipRole = role;
    }
  },
  { flush: "sync" }
);

watch(
  () => editForm.companyId,
  (companyId) => {
    editForm.departmentId = "";
    void loadDepartmentsForCompany(companyId);
  },
  { flush: "sync" }
);

watch(
  () => currentCompanyId.value,
  (companyId) => {
    if (!isCompanyAdmin.value || !companyId) {
      return;
    }

    filters.companyId = companyId;
    createForm.companyId = companyId;
    editForm.companyId = companyId;
    void loadDepartmentsForCompany(companyId);
  },
  { flush: "sync" }
);

const belongsToCurrentCompany = (user: ManagedUser) =>
  Boolean(user.memberships.find((membership) => membership.companyId === currentCompanyId.value));

const getCurrentCompanyMembership = (user: ManagedUser) =>
  user.memberships.find((membership) => membership.companyId === currentCompanyId.value) ??
  getDefaultMembership(user);

const isProtectedRole = (role?: string | null) =>
  role === "platform_admin" || role === "company_admin";

const getCompanyAdminActionDisabledReason = (
  user: ManagedUser,
  action: "edit" | "status" | "reset"
) => {
  if (!isCompanyAdmin.value) {
    return "";
  }

  if (!belongsToCurrentCompany(user)) {
    return "只能管理本公司用户";
  }

  if (user.id === authStore.currentUser?.id) {
    if (action === "edit") {
      return "不能修改自己的角色";
    }

    if (action === "status") {
      return "不能停用自己";
    }
  }

  const membership = getCurrentCompanyMembership(user);

  if (user.role === "platform_admin" || membership?.role === "platform_admin") {
    return "公司管理员不能修改平台管理员";
  }

  if (isProtectedRole(user.role) || isProtectedRole(membership?.role)) {
    return "公司管理员只能管理普通用户";
  }

  return "";
};

const getEditDisabledReason = (user: ManagedUser) =>
  getCompanyAdminActionDisabledReason(user, "edit");

const getStatusDisabledReason = (user: ManagedUser) =>
  getCompanyAdminActionDisabledReason(user, "status");

const getResetDisabledReason = (user: ManagedUser) =>
  getCompanyAdminActionDisabledReason(user, "reset");
</script>

<template>
  <section class="users-page">
    <header class="users-page__heading">
      <div>
        <el-tag effect="plain" type="success">
          {{ isCompanyAdmin ? "公司权限" : "平台权限" }}
        </el-tag>
        <h1>用户管理</h1>
        <p>管理本公司用户、角色与部门绑定</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增用户</el-button>
    </header>

    <section class="users-filter-panel">
      <el-input
        v-model="filters.keyword"
        clearable
        placeholder="搜索姓名或邮箱"
        class="users-filter-panel__keyword"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="filters.role" clearable placeholder="角色">
        <el-option
          v-for="role in filterRoleOptions"
          :key="role.value"
          :label="role.label"
          :value="role.value"
        />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="状态">
        <el-option
          v-for="status in statusOptions"
          :key="status.value"
          :label="status.label"
          :value="status.value"
        />
      </el-select>
      <el-select
        v-if="!isCompanyAdmin"
        v-model="filters.companyId"
        clearable
        filterable
        placeholder="公司"
      >
        <el-option
          v-for="company in visibleCompanyOptions"
          :key="company.value"
          :label="company.label"
          :value="company.value"
        />
      </el-select>
      <div class="users-filter-panel__actions">
        <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleResetFilters">重置</el-button>
      </div>
    </section>

    <AppErrorState v-if="tableError" title="用户列表加载失败" :message="tableError" />
    <AppLoadingState v-else-if="loading" title="正在加载用户列表" />

    <section v-else class="users-table-panel">
      <el-table v-if="users.length" :data="users" row-key="id" class="users-table">
        <el-table-column prop="name" label="姓名" min-width="130" />
        <el-table-column prop="email" label="邮箱" min-width="220" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }: { row: ManagedUser }">
            <el-tag effect="plain">{{ getRoleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属公司" min-width="170">
          <template #default="{ row }: { row: ManagedUser }">
            <span>{{ getDefaultMembership(row)?.companyName ?? "未分配" }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属部门" min-width="160">
          <template #default="{ row }: { row: ManagedUser }">
            <span>{{ formatDepartment(getDefaultMembership(row)) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isCompanyAdmin" label="公司角色" width="120">
          <template #default="{ row }: { row: ManagedUser }">
            <span>{{ getRoleLabel(getDefaultMembership(row)?.role) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }: { row: ManagedUser }">
            <el-tag :type="statusTagType(row.status)" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="!isCompanyAdmin" label="默认公司" width="100">
          <template #default="{ row }: { row: ManagedUser }">
            <el-tag v-if="getDefaultMembership(row)?.isDefault" type="success" effect="plain">
              是
            </el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }: { row: ManagedUser }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }: { row: ManagedUser }">
            <div class="users-table__actions">
              <el-tooltip
                :content="getEditDisabledReason(row)"
                :disabled="!getEditDisabledReason(row)"
              >
                <span>
                  <el-button
                    size="small"
                    :disabled="Boolean(getEditDisabledReason(row))"
                    @click="openEditDialog(row)"
                  >
                    编辑角色 / 部门
                  </el-button>
                </span>
              </el-tooltip>
              <el-tooltip
                :content="getResetDisabledReason(row)"
                :disabled="!getResetDisabledReason(row)"
              >
                <span>
                  <el-button
                    size="small"
                    :disabled="Boolean(getResetDisabledReason(row))"
                    @click="openResetPasswordDialog(row)"
                  >
                    重置密码
                  </el-button>
                </span>
              </el-tooltip>
              <el-tooltip
                :content="getStatusDisabledReason(row)"
                :disabled="!getStatusDisabledReason(row)"
              >
                <span>
                  <el-button
                    size="small"
                    :type="row.status === 'active' ? 'danger' : 'success'"
                    :disabled="Boolean(getStatusDisabledReason(row))"
                    plain
                    @click="toggleUserStatus(row)"
                  >
                    {{ row.status === "active" ? "禁用" : "启用" }}
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <AppEmptyState v-else-if="isEmpty" title="暂无用户" description="可以先新增一个运营账号。" />
      <div class="users-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <el-dialog v-model="createDialogVisible" title="新增用户" width="560px" @closed="resetCreateForm">
      <el-alert
        v-if="createFormError"
        :title="createFormError"
        type="error"
        :closable="false"
        show-icon
        class="users-dialog-alert"
      />
      <el-form label-position="top" class="users-dialog-form">
        <el-form-item label="姓名">
          <el-input v-model="createForm.name" autocomplete="off" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="createForm.email" autocomplete="off" />
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="createForm.initialPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" @change="createForm.membershipRole = createForm.role">
            <el-option
              v-for="role in visibleRoleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所属公司">
          <el-select v-if="!isCompanyAdmin" v-model="createForm.companyId" filterable>
            <el-option
              v-for="company in visibleCompanyOptions"
              :key="company.value"
              :label="company.label"
              :value="company.value"
            />
          </el-select>
          <el-input v-else :model-value="currentCompany?.name ?? '当前公司'" disabled />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select v-model="createForm.departmentId" clearable filterable placeholder="可不绑定">
            <el-option
              v-for="department in createDepartmentOptions"
              :key="department.value"
              :label="department.label"
              :value="department.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isCompanyAdmin" label="公司角色">
          <el-select v-model="createForm.membershipRole">
            <el-option
              v-for="role in visibleRoleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isCompanyAdmin" label="状态">
          <el-radio-group v-model="createForm.status">
            <el-radio-button label="active">启用</el-radio-button>
            <el-radio-button label="disabled">禁用</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreateUser">创建用户</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetDialogVisible" title="重置密码" width="480px">
      <el-alert
        title="提交后需要使用新密码登录，请通过公司内安全流程通知用户。系统不会返回或保存明文密码。"
        type="info"
        :closable="false"
        show-icon
        class="users-dialog-alert"
      />
      <el-alert
        v-if="resetFormError"
        :title="resetFormError"
        type="error"
        :closable="false"
        show-icon
        class="users-dialog-alert"
      />
      <el-form label-position="top" class="users-dialog-form">
        <el-form-item label="新密码">
          <el-input v-model="resetForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="resetForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitResetPassword">
          重置密码
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑角色 / 部门" width="520px">
      <el-alert
        v-if="editFormError"
        :title="editFormError"
        type="error"
        :closable="false"
        show-icon
        class="users-dialog-alert"
      />
      <el-form label-position="top" class="users-dialog-form">
        <el-form-item label="用户">
          <el-input :model-value="selectedUser?.email" disabled />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio-button label="active">启用</el-radio-button>
            <el-radio-button label="disabled">禁用</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所属公司">
          <el-select v-if="!isCompanyAdmin" v-model="editForm.companyId" filterable>
            <el-option
              v-for="company in visibleCompanyOptions"
              :key="company.value"
              :label="company.label"
              :value="company.value"
            />
          </el-select>
          <el-input v-else :model-value="currentCompany?.name ?? '当前公司'" disabled />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select v-model="editForm.departmentId" clearable filterable placeholder="可不绑定">
            <el-option
              v-for="department in editDepartmentOptions"
              :key="department.value"
              :label="department.label"
              :value="department.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="公司角色">
          <el-select v-model="editForm.membershipRole">
            <el-option
              v-for="role in visibleRoleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isCompanyAdmin" label="公司成员状态">
          <el-select v-model="editForm.membershipStatus">
            <el-option
              v-for="status in membershipStatusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isCompanyAdmin">
          <el-checkbox v-model="editForm.isDefault">设为默认公司</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEditUser">保存修改</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.users-page__heading,
.users-filter-panel,
.users-table-panel {
  border: 1px solid var(--geo-border);
  border-radius: 8px;
  background: var(--geo-card);
  box-shadow: var(--geo-shadow-card);
}

.users-page__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.users-page__heading h1 {
  margin: 8px 0 6px;
  font-size: 24px;
  line-height: 1.2;
  color: var(--geo-text-primary);
}

.users-page__heading p {
  margin: 0;
  color: var(--geo-text-secondary);
}

.users-filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto;
  gap: 12px;
  padding: 16px;
}

.users-filter-panel__actions {
  display: flex;
  gap: 8px;
}

.users-table-panel {
  padding: 16px;
}

.users-table__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.users-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.users-dialog-alert {
  margin-bottom: 12px;
}

.users-dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.users-dialog-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

@media (max-width: 1080px) {
  .users-filter-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .users-filter-panel__actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .users-page__heading {
    flex-direction: column;
  }

  .users-filter-panel,
  .users-dialog-form {
    grid-template-columns: 1fr;
  }
}
</style>

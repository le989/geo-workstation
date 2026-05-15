import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "@/api/auth";
import type { AuthCompany, AuthSession, AuthUser } from "@/api/auth";
import { setAuthTokenGetter, setCurrentCompanyGetter, setUnauthorizedHandler } from "@/api/http";

const TOKEN_STORAGE_KEY = "geo-workstation.auth-token";
const USER_STORAGE_KEY = "geo-workstation.auth-user";
const CURRENT_COMPANY_STORAGE_KEY = "geo-workstation.auth-current-company-id";

const readStoredUser = (): AuthUser | null => {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(window.localStorage.getItem(TOKEN_STORAGE_KEY));
  const currentUser = ref<AuthUser | null>(readStoredUser());
  const companies = ref<AuthCompany[]>([]);
  const currentCompany = ref<AuthCompany | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && currentUser.value));
  const isPlatformAdmin = computed(() => Boolean(currentUser.value?.isPlatformAdmin));
  const currentRole = computed(() => currentCompany.value?.role ?? currentUser.value?.role ?? null);

  const selectCurrentCompany = (
    availableCompanies: AuthCompany[],
    fallbackCompany: AuthCompany,
    preferredCompanyId?: string | null
  ) =>
    (preferredCompanyId
      ? availableCompanies.find((company) => company.id === preferredCompanyId)
      : undefined) ??
    availableCompanies.find((company) => company.id === fallbackCompany.id) ??
    availableCompanies.find((company) => company.isDefault) ??
    availableCompanies[0] ??
    null;

  const applySession = (session: AuthSession, preferredCompanyId?: string | null) => {
    currentUser.value = session.user;
    companies.value = session.companies;
    currentCompany.value = selectCurrentCompany(
      session.companies,
      session.currentCompany,
      preferredCompanyId
    );
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));

    if (currentCompany.value) {
      window.localStorage.setItem(CURRENT_COMPANY_STORAGE_KEY, currentCompany.value.id);
    } else {
      window.localStorage.removeItem(CURRENT_COMPANY_STORAGE_KEY);
    }
  };

  const persistSession = (nextToken: string, session: AuthSession) => {
    token.value = nextToken;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    applySession(session);
  };

  const clearSession = () => {
    token.value = null;
    currentUser.value = null;
    companies.value = [];
    currentCompany.value = null;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(CURRENT_COMPANY_STORAGE_KEY);
  };

  const login = async (payload: { email: string; password: string }) => {
    loading.value = true;
    try {
      const result = await loginRequest(payload);
      persistSession(result.token, result);
      return result.user;
    } finally {
      loading.value = false;
    }
  };

  const ensureSession = async () => {
    if (!token.value) {
      clearSession();
      return false;
    }

    if (currentUser.value && currentCompany.value) {
      return true;
    }

    try {
      await refreshCurrentUser();
      return true;
    } catch {
      clearSession();
      return false;
    }
  };

  const refreshCurrentUser = async () => {
    const preferredCompanyId = window.localStorage.getItem(CURRENT_COMPANY_STORAGE_KEY);
    const session = await getCurrentUser(preferredCompanyId);
    applySession(session, preferredCompanyId);
    return session.user;
  };

  const setCurrentCompany = (companyId: string) => {
    const nextCompany = companies.value.find((company) => company.id === companyId);

    if (!nextCompany) {
      return false;
    }

    currentCompany.value = nextCompany;
    window.localStorage.setItem(CURRENT_COMPANY_STORAGE_KEY, nextCompany.id);
    return true;
  };

  const logout = async () => {
    try {
      if (token.value) {
        await logoutRequest();
      }
    } finally {
      clearSession();
    }
  };

  setAuthTokenGetter(() => token.value);
  setCurrentCompanyGetter(() => currentCompany.value?.id ?? null);
  setUnauthorizedHandler(() => {
    clearSession();
    window.dispatchEvent(new CustomEvent("geo-auth:unauthorized"));
  });

  return {
    token,
    currentUser,
    companies,
    currentCompany,
    loading,
    isAuthenticated,
    isPlatformAdmin,
    currentRole,
    login,
    logout,
    ensureSession,
    refreshCurrentUser,
    setCurrentCompany,
    clearSession
  };
});

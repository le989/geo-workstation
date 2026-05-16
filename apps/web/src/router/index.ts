import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { canAccessRoute, type NormalizedRole } from "@/utils/permission";
import { routes } from "./routes";

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const isPublicOnly = Boolean(to.meta.publicOnly);
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (isPublicOnly && (await authStore.ensureSession())) {
    return "/dashboard";
  }

  if (requiresAuth && !(await authStore.ensureSession())) {
    return {
      path: "/login",
      query: {
        redirect: to.fullPath
      }
    };
  }

  if (requiresAuth) {
    const allowedRoles = to.matched
      .map((record) => record.meta.allowedRoles)
      .find(Boolean) as NormalizedRole[] | undefined;
    const role = authStore.currentRole ?? authStore.currentUser?.role;

    if (!canAccessRoute(to.path, role, allowedRoles)) {
      return {
        path: "/403",
        query: {
          from: to.fullPath
        }
      };
    }
  }

  return true;
});

window.addEventListener("geo-auth:unauthorized", () => {
  if (router.currentRoute.value.path !== "/login") {
    void router.replace({
      path: "/login",
      query: {
        redirect: router.currentRoute.value.fullPath
      }
    });
  }
});

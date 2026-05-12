import { computed } from "vue";
import { defineStore } from "pinia";
import { getApiBaseUrl } from "@/api/http";

export const useAppStore = defineStore("app", () => {
  const apiBaseUrl = computed(() => getApiBaseUrl());
  const environmentLabel = computed(() => import.meta.env.VITE_APP_ENV_LABEL || "Local / Mock");
  const healthUrl = computed(() => `${apiBaseUrl.value}/health`);

  return {
    apiBaseUrl,
    environmentLabel,
    healthUrl
  };
});

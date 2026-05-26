import { computed } from "vue";
import { defineStore } from "pinia";
import { getApiBaseUrl } from "@/api/http";
import { appEnvironment } from "@/config/app-env";

export const useAppStore = defineStore("app", () => {
  const apiBaseUrl = computed(() => getApiBaseUrl());
  const appEnv = computed(() => appEnvironment.env);
  const environmentLabel = computed(() => appEnvironment.label);
  const healthUrl = computed(() => `${apiBaseUrl.value}/health`);
  const isProduction = computed(() => appEnvironment.isProduction);
  const mockEnabled = computed(() => appEnvironment.mockEnabled);

  return {
    appEnv,
    apiBaseUrl,
    environmentLabel,
    healthUrl,
    isProduction,
    mockEnabled
  };
});

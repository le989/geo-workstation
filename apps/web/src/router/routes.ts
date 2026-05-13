import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import { navigationItems, pageMetaByPath } from "@/config/navigation";
import DashboardView from "@/views/DashboardView.vue";
import ContentTasksView from "@/views/ContentTasksView.vue";
import ExpansionView from "@/views/ExpansionView.vue";
import GeoAnalysisView from "@/views/GeoAnalysisView.vue";
import GeoPromptsView from "@/views/GeoPromptsView.vue";
import InstructionTemplatesView from "@/views/InstructionTemplatesView.vue";
import KnowledgeBasesView from "@/views/KnowledgeBasesView.vue";
import ModelInclusionRecordsView from "@/views/ModelInclusionRecordsView.vue";
import ModulePlaceholderView from "@/views/ModulePlaceholderView.vue";
import ReportsView from "@/views/ReportsView.vue";
import LoginView from "@/views/LoginView.vue";

export const phase3aRoutePaths = [
  "/dashboard",
  "/geo-analysis",
  "/geo-prompts",
  "/expansion",
  "/knowledge-bases",
  "/instruction-templates",
  "/content-tasks",
  "/model-inclusion-records",
  "/reports",
  "/settings"
] as const;

const routeNameFromPath = (path: string) => path.replace(/^\//, "").replaceAll("-", "_");

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: AppLayout,
    children: [
      {
        path: "",
        redirect: "/dashboard"
      },
      ...navigationItems.map((item) => ({
        path: item.path.replace(/^\//, ""),
        name: routeNameFromPath(item.path),
        component:
          item.path === "/dashboard"
            ? DashboardView
            : item.path === "/geo-analysis"
              ? GeoAnalysisView
              : item.path === "/geo-prompts"
                ? GeoPromptsView
                : item.path === "/expansion"
                  ? ExpansionView
                  : item.path === "/knowledge-bases"
                    ? KnowledgeBasesView
                    : item.path === "/instruction-templates"
                      ? InstructionTemplatesView
                      : item.path === "/content-tasks"
                        ? ContentTasksView
                        : item.path === "/model-inclusion-records"
                          ? ModelInclusionRecordsView
                          : item.path === "/reports"
                            ? ReportsView
                            : ModulePlaceholderView,
        meta: {
          geoPage: pageMetaByPath[item.path],
          requiresAuth: true
        }
      }))
    ]
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: {
      publicOnly: true
    }
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard"
  }
];

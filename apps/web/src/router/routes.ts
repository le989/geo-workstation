import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import { navigationItems, pageMetaByPath } from "@/config/navigation";
import DashboardView from "@/views/DashboardView.vue";
import ContentTasksView from "@/views/ContentTasksView.vue";
import ExpansionView from "@/views/ExpansionView.vue";
import ForbiddenView from "@/views/ForbiddenView.vue";
import GeoAnalysisView from "@/views/GeoAnalysisView.vue";
import GeoPromptsView from "@/views/GeoPromptsView.vue";
import InstructionTemplatesView from "@/views/InstructionTemplatesView.vue";
import KnowledgeBasesView from "@/views/KnowledgeBasesView.vue";
import ModelInclusionRecordsView from "@/views/ModelInclusionRecordsView.vue";
import ModulePlaceholderView from "@/views/ModulePlaceholderView.vue";
import ReportsView from "@/views/ReportsView.vue";
import SettingsView from "@/views/SettingsView.vue";
import UsersView from "@/views/UsersView.vue";
import HelpView from "@/views/HelpView.vue";
import LandingView from "@/views/LandingView.vue";
import LoginView from "@/views/LoginView.vue";
import StylePreviewView from "@/views/StylePreviewView.vue";

export const phase3aRoutePaths = [
  "/dashboard",
  "/geo-analysis",
  "/geo-prompts",
  "/expansion",
  "/knowledge-bases",
  "/instruction-templates",
  "/geo-content",
  "/model-inclusion-records",
  "/reports",
  "/settings",
  "/help"
] as const;

const routeNameFromPath = (path: string) => path.replace(/^\//, "").replaceAll("-", "_");

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "landing",
    component: LandingView
  },
  {
    path: "/",
    component: AppLayout,
    children: [
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
                      : item.path === "/geo-content"
                        ? ContentTasksView
                        : item.path === "/model-inclusion-records"
                          ? ModelInclusionRecordsView
                          : item.path === "/reports"
                            ? ReportsView
                            : item.path === "/users"
                              ? UsersView
                              : item.path === "/settings"
                                ? SettingsView
                                : item.path === "/help"
                                  ? HelpView
                                  : ModulePlaceholderView,
        meta: {
          geoPage: pageMetaByPath[item.path],
          requiresAuth: true,
          allowedRoles: item.allowedRoles
        }
      })),
      {
        path: "content-tasks",
        name: "content_tasks_legacy",
        component: ContentTasksView,
        meta: {
          geoPage: pageMetaByPath["/geo-content"],
          requiresAuth: true,
          allowedRoles: pageMetaByPath["/geo-content"]?.allowedRoles
        }
      }
    ]
  },
  {
    path: "/403",
    name: "forbidden",
    component: ForbiddenView,
    meta: {
      requiresAuth: true
    }
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
    path: "/style-preview",
    name: "style_preview",
    component: StylePreviewView
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard"
  }
];

import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import { navigationItems, pageMetaByPath } from "@/config/navigation";
import DashboardView from "@/views/DashboardView.vue";
import GeoPromptsView from "@/views/GeoPromptsView.vue";
import ModulePlaceholderView from "@/views/ModulePlaceholderView.vue";

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
            : item.path === "/geo-prompts"
              ? GeoPromptsView
              : ModulePlaceholderView,
        meta: {
          geoPage: pageMetaByPath[item.path]
        }
      }))
    ]
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard"
  }
];

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import GeoPageShell from "@/components/GeoPageShell.vue";
import { pageMetaByPath } from "@/config/navigation";
import type { GeoPageMeta } from "@/config/navigation";

const route = useRoute();

const page = computed<GeoPageMeta>(() => {
  const metaPage = route.meta.geoPage as GeoPageMeta | undefined;
  return metaPage || pageMetaByPath["/dashboard"];
});
</script>

<template>
  <GeoPageShell
    :title="page.title"
    :label="page.label"
    :question="page.question"
    :description="page.description"
    :phase-note="page.phaseNote"
    :next-steps="page.nextSteps"
    :api-focus="page.apiFocus"
    :icon="page.icon"
  />
</template>

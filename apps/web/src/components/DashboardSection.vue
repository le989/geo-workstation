<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  {
    description: ""
  }
);
</script>

<template>
  <section class="dashboard-section">
    <header class="dashboard-section__header">
      <div>
        <p class="section-kicker">GEO 工作台</p>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>

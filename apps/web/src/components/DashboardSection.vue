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
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>

<style scoped>
.dashboard-section {
  display: grid;
  gap: 14px;
}

.dashboard-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-section__header h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.dashboard-section__header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .dashboard-section__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

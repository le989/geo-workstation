<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value?: string | number;
    description?: string;
    loading?: boolean;
    percent?: number;
    tone?: "default" | "good" | "warning" | "danger";
  }>(),
  {
    description: "",
    loading: false,
    percent: undefined,
    tone: "default",
    value: 0
  }
);

const normalizedPercent = () => {
  if (props.percent === undefined || Number.isNaN(props.percent)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, props.percent));
};
</script>

<template>
  <article :class="['report-metric-card', `report-metric-card--${tone}`]">
    <template v-if="loading">
      <el-skeleton animated :rows="2" />
    </template>
    <template v-else>
      <span>{{ label }}</span>
      <strong>{{ value ?? 0 }}</strong>
      <p v-if="description">{{ description }}</p>
      <el-progress
        v-if="normalizedPercent() !== undefined"
        :percentage="normalizedPercent()"
        :show-text="false"
        :stroke-width="7"
      />
    </template>
  </article>
</template>

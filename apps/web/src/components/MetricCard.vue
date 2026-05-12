<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    value?: string | number;
    description?: string;
    tone?: "default" | "good" | "warning" | "danger";
    loading?: boolean;
    percent?: number;
  }>(),
  {
    value: 0,
    description: "",
    tone: "default",
    loading: false,
    percent: undefined
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
  <article :class="['metric-card', `metric-card--${tone}`]">
    <template v-if="loading">
      <el-skeleton animated :rows="2" />
    </template>
    <template v-else>
      <span class="metric-card__label">{{ label }}</span>
      <strong class="metric-card__value">{{ value ?? 0 }}</strong>
      <p v-if="description" class="metric-card__description">{{ description }}</p>
      <el-progress
        v-if="normalizedPercent() !== undefined"
        :percentage="normalizedPercent()"
        :show-text="false"
        :stroke-width="7"
      />
    </template>
  </article>
</template>

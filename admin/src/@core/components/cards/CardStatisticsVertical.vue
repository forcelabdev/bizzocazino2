<script setup>
import VueApexCharts from 'vue3-apexcharts';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: false,
    default: 'primary',
  },
  icon: {
    type: String,
    required: true,
  },
  stats: {
    type: String,
    required: true,
  },
  height: {
    type: Number,
    required: false,
    default: 100,
  },
  series: {
    type: Array,
    required: true,
  },
  chartOptions: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <VCard>
    <VCardText class="d-flex flex-column pb-0">
      <!-- Icon -->
      <VAvatar
        v-if="props.icon"
        size="42"
        variant="tonal"
        :color="props.color"
        :icon="props.icon"
        class="mb-3"
      />

      <!-- Title -->
      <span class="text-sm text-medium-emphasis mb-1">
        {{ props.title }}
      </span>

      <!-- Stat -->
      <h4 class="text-h4 font-weight-bold">
        {{ props.stats }}
      </h4>
    </VCardText>

    <!-- Chart -->
    <VueApexCharts
      :series="props.series"
      :options="props.chartOptions"
      :height="props.height"
    />
  </VCard>
</template>

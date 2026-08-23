<script setup>
// 🎯 Segment/koşul motoru için ortak builder UI (bkz. backend/utils/promoConditionEngine.js).
// Promo kod (admin/src/pages/apps/promo/index.vue) VE Site İçi Mesaj segmentasyonu
// (admin/src/pages/apps/notice/index.vue) tarafından paylaşılır — aynı şema:
// { metric, operator, value, dateFrom, dateTo }
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: "Segment Koşulları",
  },
})

const emit = defineEmits(["update:modelValue"])

const CONDITION_METRIC_OPTIONS = [
  { title: "Yatırım tutarı (₺)", value: "deposit" },
  { title: "Çekim tutarı (₺)", value: "withdraw" },
  { title: "Üyelik yaşı (gün)", value: "membershipAgeDays" },
  { title: "Belirli tarihten itibaren yatırım (₺)", value: "depositSinceDate" },
]
const CONDITION_OPERATOR_OPTIONS = [
  { title: "büyük eşit (≥)", value: "gte" },
  { title: "küçük eşit (≤)", value: "lte" },
  { title: "eşit (=)", value: "eq" },
  { title: "büyük (>)", value: "gt" },
  { title: "küçük (<)", value: "lt" },
]
const DATE_METRICS = ["deposit", "withdraw", "depositSinceDate"]
const QUICK_RANGE_OPTIONS = [
  { title: "Belirli tarihten itibaren", value: "custom" },
  { title: "Son 7 gün", value: 7 },
  { title: "Son 14 gün", value: 14 },
  { title: "Son 30 gün", value: 30 },
]

const conditions = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value),
})

const addCondition = () => {
  conditions.value = [
    ...conditions.value,
    { metric: "deposit", operator: "gte", value: 0, dateFrom: "", dateTo: "", quickRange: "custom" },
  ]
}
const removeCondition = index => {
  conditions.value = conditions.value.filter((_, i) => i !== index)
}
const applyQuickRange = condition => {
  if (condition.quickRange === "custom") return
  const days = Number(condition.quickRange)
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  condition.dateFrom = from.toISOString().slice(0, 10)
  condition.dateTo = ""
}
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-3">
      <span class="text-subtitle-1">{{ title }}</span>
      <VBtn
        size="small"
        variant="tonal"
        prepend-icon="tabler-plus"
        @click="addCondition"
      >
        Koşul Ekle
      </VBtn>
    </div>
    <div
      v-if="!conditions.length"
      class="text-body-2 text-medium-emphasis mb-2"
    >
      Koşul eklenmediyse tüm hedef grup kapsanır. Eklenen tüm koşullar VE (AND) ile birleştirilir.
    </div>
    <VCard
      v-for="(condition, index) in conditions"
      :key="index"
      variant="tonal"
      class="mb-3"
    >
      <VCardText>
        <VRow dense>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="condition.metric"
              :items="CONDITION_METRIC_OPTIONS"
              label="Metrik"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="condition.operator"
              :items="CONDITION_OPERATOR_OPTIONS"
              label="Operatör"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="condition.value"
              label="Değer"
              type="number"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="1"
            class="d-flex align-center justify-end"
          >
            <IconBtn @click="removeCondition(index)">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </VCol>
          <template v-if="DATE_METRICS.includes(condition.metric)">
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="condition.quickRange"
                :items="QUICK_RANGE_OPTIONS"
                label="Tarih aralığı"
                density="compact"
                @update:model-value="applyQuickRange(condition)"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <AppTextField
                v-model="condition.dateFrom"
                label="Başlangıç tarihi"
                type="date"
                density="compact"
                :disabled="condition.quickRange !== 'custom'"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <AppTextField
                v-model="condition.dateTo"
                label="Bitiş tarihi (boş = bugüne kadar)"
                type="date"
                density="compact"
                :disabled="condition.quickRange !== 'custom'"
              />
            </VCol>
          </template>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

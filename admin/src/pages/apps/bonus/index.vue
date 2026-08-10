<script setup lang="ts">
import axios from '@axios'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const bonusList = ref([])
const loading = ref(false)

const newBonus = ref({
  type: '',
  percentage: 0,
  minAmount: 0,
  maxAmount: 0,
  maxDepositLimit: 0,
  dailyLimit: 1,
  enabled: true,
})

const bonusTypes = [
  { title: t('bonus.firstDeposit'), value: 'first_deposit' },
  { title: t('bonus.secondDeposit'), value: 'second_deposit' },
  { title: t('bonus.thirdDeposit'), value: 'third_deposit' },
  { title: t('bonus.fourthDeposit'), value: 'fourth_deposit' },
  { title: t('bonus.regularDeposit'), value: 'regular_deposit' },
]

const fetchBonuses = async () => {
  loading.value = true
  const res = await axios.get('/admin/bonus-settings')
  bonusList.value = res.data.data
  loading.value = false
}

const saveBonus = async bonus => {
  await axios.put(`/admin/bonus-settings/${bonus._id}`, bonus)
  fetchBonuses()
}

const createBonus = async () => {
  await axios.post('/admin/bonus-settings', newBonus.value)
  newBonus.value = {
    type: '',
    percentage: 0,
    minAmount: 0,
    maxAmount: 0,
    maxDepositLimit: 0,
    dailyLimit: 1,
    enabled: true,
  }
  fetchBonuses()
}

onMounted(fetchBonuses)
</script>

<template>
  <div>
  <VCard class="mb-6">
    <VCardTitle>{{ t('bonus.addNew') }}</VCardTitle>
    <VCardText>
      <VForm @submit.prevent="createBonus">
        <VRow>
          <VCol cols="12" md="4">
            <VSelect
              v-model="newBonus.type"
              :items="bonusTypes"
              item-title="title"
              item-value="value"
              :label="t('bonus.type')"
              required
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model.number="newBonus.percentage"
              :label="t('bonus.percentage')"
              type="number"
              required
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model.number="newBonus.minAmount"
              :label="t('bonus.minAmount')"
              type="number"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model.number="newBonus.maxAmount"
              :label="t('bonus.maxAmount')"
              type="number"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model.number="newBonus.maxDepositLimit"
              :label="t('bonus.maxDepositLimit')"
              type="number"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VTextField
              v-model.number="newBonus.dailyLimit"
              :label="t('bonus.dailyLimit')"
              type="number"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VSwitch
              v-model="newBonus.enabled"
              :label="t('bonus.active')"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VBtn type="submit">
              {{ t('bonus.add') }}
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>

  <VCard>
    <VCardTitle>{{ t('bonus.settings') }}</VCardTitle>
    <VDataTable
      :items="bonusList"
      :headers="[
        { title: t('bonus.type'), key: 'type' },
        { title: t('bonus.percentage'), key: 'percentage' },
        { title: t('bonus.minAmount'), key: 'minAmount' },
        { title: t('bonus.maxAmount'), key: 'maxAmount' },
        { title: t('bonus.maxDepositLimit'), key: 'maxDepositLimit' },
        { title: t('bonus.dailyLimit'), key: 'dailyLimit' },
        { title: t('bonus.active'), key: 'enabled' },
        { title: t('actions'), key: 'actions', sortable: false },
      ]"
      :loading="loading"
    >
      <template #item.enabled="{ item }">
        <VChip :color="item.raw.enabled ? 'success' : 'secondary'">
          {{ item.raw.enabled ? t('bonus.active') : t('bonus.inactive') }}
        </VChip>
      </template>

      <template #item.actions="{ item }">
        <VBtn size="small" color="primary" @click="saveBonus(item.raw)">
          {{ t('save') }}
        </VBtn>
      </template>

      <template #item.type="{ item }">
        <span>{{ bonusTypes.find(t => t.value === item.raw.type)?.title || item.raw.type }}</span>
      </template>

      <template #item.percentage="{ item }">
        <VTextField v-model.number="item.raw.percentage" type="number" hide-details density="compact" />
      </template>
      <template #item.minAmount="{ item }">
        <VTextField v-model.number="item.raw.minAmount" type="number" hide-details density="compact" />
      </template>
      <template #item.maxAmount="{ item }">
        <VTextField v-model.number="item.raw.maxAmount" type="number" hide-details density="compact" />
      </template>
      <template #item.maxDepositLimit="{ item }">
        <VTextField v-model.number="item.raw.maxDepositLimit" type="number" hide-details density="compact" />
      </template>
      <template #item.dailyLimit="{ item }">
        <VTextField v-model.number="item.raw.dailyLimit" type="number" hide-details density="compact" />
      </template>
    </VDataTable>
  </VCard>
  </div>
</template>

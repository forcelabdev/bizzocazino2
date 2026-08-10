<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const form = ref({
  name: '',
  startDate: '',
  endDate: '',
  isActive: true,
  premiumPrice: 0,
  premiumBenefits: '',
  totalLevels: 10,
  xpPerLevel: Array.from({ length: 10 }, () => 100),
})

const isLoading = ref(false)
const error = ref(null)

const submitForm = async () => {
  isLoading.value = true
  error.value = null

  try {
    const xpArray = form.value.xpPerLevel.map((val, i) => {
      const num = Number(val)
      if (isNaN(num)) throw new Error(t('invalidXpValue', { level: i + 1 }))
      return num
    })

    const payload = {
      name: form.value.name,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      isActive: form.value.isActive,
      premiumPrice: Number(form.value.premiumPrice),
      premiumBenefits: form.value.premiumBenefits
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      totalLevels: Number(form.value.totalLevels),
      xpPerLevel: xpArray,
    }

    console.log('[SEASON PAYLOAD]', payload)
    await axios.post('/admin/season', payload)
    alert(t('seasonCreated'))
  } catch (err) {
    console.error('❌ Save error:', err)
    error.value = t('serverError') + ': ' + (err.response?.data?.message || err.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <VCard :title="t('createSeason')">
    <VCardText>
      <VForm @submit.prevent="submitForm">
        <VRow>
          <!-- Sezon Adı -->
          <VCol cols="12">
            <AppTextField
              v-model="form.name"
              :label="t('seasonName')"
              :rules="[requiredValidator]"
            />
          </VCol>

          <!-- Tarihler -->
          <VCol cols="6">
            <AppTextField
              v-model="form.startDate"
              :label="t('startDate')"
              type="date"
              :rules="[requiredValidator]"
            />
          </VCol>

          <VCol cols="6">
            <AppTextField
              v-model="form.endDate"
              :label="t('endDate')"
              type="date"
              :rules="[requiredValidator]"
            />
          </VCol>

          <!-- Premium -->
          <VCol cols="6">
            <AppTextField
              v-model.number="form.premiumPrice"
              :label="t('premiumPrice')"
              type="number"
            />
          </VCol>

          <VCol cols="6">
            <AppTextField
              v-model="form.premiumBenefits"
              :label="t('premiumBenefits')"
            />
          </VCol>

          <!-- Seviye -->
          <VCol cols="6">
            <AppTextField
              v-model.number="form.totalLevels"
              :label="t('totalLevels')"
              type="number"
              :rules="[requiredValidator]"
              @change="val => {
                const newLevel = Number(val)
                if (!isNaN(newLevel) && newLevel > 0) {
                  form.xpPerLevel = Array.from(
                    { length: newLevel },
                    (_, i) => form.xpPerLevel[i] || 100
                  )
                }
              }"
            />
          </VCol>

          <!-- XP Per Level -->
          <VCol cols="12">
            <h4 class="mt-4">{{ t('xpPerLevelValues') }}</h4>
          </VCol>

          <VCol
            v-for="(val, index) in form.xpPerLevel"
            :key="index"
            cols="6"
          >
            <AppTextField
              :label="`${t('level')} ${index + 1} XP`"
              type="number"
              :model-value="form.xpPerLevel[index]"
              @update:modelValue="v => form.xpPerLevel[index] = Number(v)"
            />
          </VCol>

          <!-- Kaydet Butonu -->
          <VCol cols="12" class="d-flex justify-end">
            <VBtn
              type="submit"
              :loading="isLoading"
              color="primary"
            >
              {{ t('saveSeason') }}
            </VBtn>
          </VCol>

          <!-- Hata -->
          <VCol v-if="error" cols="12">
            <VAlert type="error" border="start" prominent>
              {{ error }}
            </VAlert>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>

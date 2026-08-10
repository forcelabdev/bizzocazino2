<template>
  <VCard flat class="p-6 telegram-settings">
    <VCardTitle class="text-lg font-semibold mb-6 d-flex align-center">
      <VIcon icon="tabler-settings" class="me-2" />
      Telegram Bot Ayarları ⚙️
    </VCardTitle>

    <VForm @submit.prevent="updateSettings">
      <VRow dense>
        <VCol cols="12" md="6">
          <VTextarea
            label="🎬 Başlangıç Mesajı"
            v-model="form.start_message"
            rows="5"
            variant="outlined"
            auto-grow
            placeholder="Botun /start komutuna yanıtı"
          />
        </VCol>

        <VCol cols="12" md="6">
          <VTextarea
            label="💬 Canlı Destek Mesajı"
            v-model="form.support_message"
            rows="5"
            variant="outlined"
            auto-grow
            placeholder="Kullanıcı canlı destek seçtiğinde gönderilecek mesaj"
          />
        </VCol>

        <VCol cols="12" md="6">
          <VTextarea
            label="🎁 Kampanyalar Mesajı"
            v-model="form.promotions_message"
            rows="5"
            variant="outlined"
            auto-grow
            placeholder="Kullanıcı kampanyalar butonuna bastığında gönderilecek mesaj"
          />
        </VCol>

        <VCol cols="12" md="6">
          <VTextarea
            label="🔗 Casino Linki Mesajı"
            v-model="form.casino_link_message"
            rows="5"
            variant="outlined"
            auto-grow
            placeholder="Casino yönlendirme bağlantısı"
          />
        </VCol>
      </VRow>

      <div class="text-end mt-6">
        <VBtn color="primary" :loading="saving" type="submit">
          <VIcon start icon="tabler-device-floppy" />
          Kaydet
        </VBtn>
      </div>
    </VForm>
  </VCard>
</template>

<script setup>
/* Vuetify bileşenlerini manuel import et — görünmeme sorununu çözer */
import {
    VBtn,
    VCard,
    VCardTitle,
    VCol,
    VForm,
    VIcon,
    VRow,
    VTextarea
} from 'vuetify/components'

import { useNotify } from '@/composables/useNotify'
import axios from '@/plugins/axios'
import { onMounted, ref } from 'vue'

const notify = useNotify()
const saving = ref(false)

const form = ref({
  start_message: '',
  support_message: '',
  promotions_message: '',
  casino_link_message: '',
})

// 📥 Ayarları backend'den al
const fetchSettings = async () => {
  try {
    const { data } = await axios.get('/telegram-settings')
    console.log('🔹 Gelen data:', data)
    if (data?.data) Object.assign(form.value, data.data)
  } catch (err) {
    console.error('❌ Ayarlar yüklenemedi:', err)
    notify.error('Ayarlar yüklenemedi ❌')
  }
}

// 💾 Ayarları kaydet
const updateSettings = async () => {
  try {
    saving.value = true
    const { data } = await axios.put('/telegram-settings', form.value)
    notify.success(data.message || 'Ayarlar başarıyla kaydedildi 🎉')
    await fetchSettings()
  } catch (err) {
    console.error('❌ Güncelleme hatası:', err)
    notify.error('Kaydedilirken hata oluştu ❌')
  } finally {
    saving.value = false
  }
}

onMounted(fetchSettings)
</script>

<style scoped>
.telegram-settings {
  border-radius: 12px;
  background-color: var(--v-theme-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.v-card-title {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  padding-bottom: 1rem !important;
}

.v-textarea {
  background: var(--v-theme-background);
}

.v-textarea .v-field__input {
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>

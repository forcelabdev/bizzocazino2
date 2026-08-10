<template>
  <VCard flat class="p-6">
    <VCardTitle class="text-lg font-semibold mb-4">📢 Toplu Post Gönder</VCardTitle>
    <VForm @submit.prevent="sendBroadcast">
      <VTextArea
        v-model="message"
        label="Gönderilecek Mesaj"
        rows="6"
        placeholder="Duyuru mesajınızı buraya yazın..."
      />
      <div class="text-end mt-4">
        <VBtn color="primary" :loading="loading" type="submit">
          <VIcon start icon="tabler-send" /> Gönder
        </VBtn>
      </div>
    </VForm>
  </VCard>
</template>

<script setup>
import { useNotify } from '@/composables/useNotify'
import axios from '@/plugins/axios'
import { ref } from 'vue'
const notify = useNotify()

const message = ref('')
const loading = ref(false)

const sendBroadcast = async () => {
  if (!message.value.trim()) return notify.info('Mesaj boş olamaz.')
  try {
    loading.value = true
    const { data } = await axios.post('/telegram/broadcast', { message: message.value })
    notify.success(data.message || 'Mesaj gönderildi ✅')
    message.value = ''
  } catch {
    notify.error('Gönderim sırasında hata oluştu ❌')
  } finally {
    loading.value = false
  }
}
</script>

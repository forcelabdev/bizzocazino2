<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from '@/plugins/axios'

const files = ref([])
const loading = ref(false)
const uploadDialog = ref(false)
const selectedFiles = ref([])
const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortDesc = ref(true)

// Dosya yükleme
const fileInput = ref(null)
const uploadingFiles = ref([])

// URL'den yükleme
const urlUploadDialog = ref(false)
const urlInput = ref('')
const urlUploading = ref(false)
const urlUploadError = ref('')

// Dosyaları getir
const fetchFiles = async () => {
  try {
    loading.value = true
    const response = await axios.get('/admin/files')
    files.value = response.data
  } catch (error) {
    console.error('Dosyalar yüklenemedi:', error)
  } finally {
    loading.value = false
  }
}

// Dosya yükle
const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await axios.post('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    files.value.unshift(response.data)
    return response.data
  } catch (error) {
    console.error('Dosya yüklenemedi:', error)
    throw error
  }
}

// Çoklu dosya yükleme
const handleFileUpload = async (event) => {
  const selectedFiles = Array.from(event.target.files)
  uploadingFiles.value = selectedFiles.map(f => ({ name: f.name, progress: 0, uploaded: false }))

  for (let i = 0; i < selectedFiles.length; i++) {
    try {
      await uploadFile(selectedFiles[i])
      uploadingFiles.value[i].uploaded = true
      uploadingFiles.value[i].progress = 100
    } catch (error) {
      uploadingFiles.value[i].error = true
    }
  }

  setTimeout(() => {
    uploadingFiles.value = []
    uploadDialog.value = false
  }, 1500)
  
  fetchFiles()
}

// URL'den dosya yükle
const uploadFromUrl = async () => {
  if (!urlInput.value) return
  
  urlUploading.value = true
  urlUploadError.value = ''
  
  try {
    const response = await axios.post('/admin/files/upload-url', {
      url: urlInput.value
    })
    
    files.value.unshift(response.data)
    urlInput.value = ''
    urlUploadDialog.value = false
    fetchFiles()
  } catch (error) {
    urlUploadError.value = error.response?.data?.error || 'URL\'den dosya indirilemedi.'
  } finally {
    urlUploading.value = false
  }
}

// Dosya sil
const deleteFile = async (filename) => {
  if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return

  try {
    await axios.delete(`/admin/files/${filename}`)
    files.value = files.value.filter(f => f.filename !== filename)
    alert('Dosya başarıyla silindi!')
  } catch (error) {
    console.error('Dosya silinemedi:', error)
    alert('Dosya silinirken bir hata oluştu!')
  }
}

// URL'yi panoya kopyala
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('URL panoya kopyalandı!')
  }).catch(err => {
    console.error('Kopyalama hatası:', err)
  })
}

// Dosya boyutunu formatla
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Dosya tipine göre ikon
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  const iconMap = {
    // Resimler
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    png: 'mdi-file-image',
    gif: 'mdi-file-image',
    svg: 'mdi-file-image',
    webp: 'mdi-file-image',
    // Videolar
    mp4: 'mdi-file-video',
    avi: 'mdi-file-video',
    mov: 'mdi-file-video',
    // Dökümanlar
    pdf: 'mdi-file-pdf-box',
    doc: 'mdi-file-word',
    docx: 'mdi-file-word',
    xls: 'mdi-file-excel',
    xlsx: 'mdi-file-excel',
    // Arşiv
    zip: 'mdi-folder-zip',
    rar: 'mdi-folder-zip',
    // Varsayılan
    default: 'mdi-file'
  }
  return iconMap[ext] || iconMap.default
}

// Filtrelenmiş ve sıralanmış dosyalar
const filteredFiles = computed(() => {
  let result = [...files.value]

  // Arama filtresi
  if (searchQuery.value) {
    result = result.filter(file =>
      file.filename.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Sıralama
  result.sort((a, b) => {
    let aVal = a[sortBy.value]
    let bVal = b[sortBy.value]
    
    if (sortBy.value === 'createdAt' || sortBy.value === 'modifiedAt') {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }
    
    if (sortDesc.value) {
      return bVal > aVal ? 1 : -1
    }
    return aVal > bVal ? 1 : -1
  })

  return result
})

// Dosya önizlemesi
const isImage = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)
}

onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-folder-multiple" class="me-2" />
        Dosya Yöneticisi
        <VSpacer />
        <VBtn
          color="secondary"
          prepend-icon="mdi-link-variant"
          class="me-2"
          @click="urlUploadDialog = true"
        >
          URL'den Yükle
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="mdi-upload"
          @click="uploadDialog = true"
        >
          Dosya Yükle
        </VBtn>
      </VCardTitle>

      <VCardText>
        <!-- Arama ve Filtreler -->
        <VRow class="mb-4">
          <VCol cols="12" md="6">
            <VTextField
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              label="Dosya Ara"
              clearable
              hide-details
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="sortBy"
              :items="[
                { title: 'Tarih', value: 'createdAt' },
                { title: 'İsim', value: 'filename' },
                { title: 'Boyut', value: 'size' }
              ]"
              label="Sırala"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="sortDesc"
              :items="[
                { title: 'Azalan', value: true },
                { title: 'Artan', value: false }
              ]"
              label="Sıralama"
              hide-details
            />
          </VCol>
        </VRow>

        <!-- Loading -->
        <VProgressLinear v-if="loading" indeterminate />

        <!-- Dosya Grid -->
        <VRow v-if="!loading && filteredFiles.length > 0">
          <VCol
            v-for="file in filteredFiles"
            :key="file.filename"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <VCard class="file-card" hover>
              <!-- Önizleme -->
              <div class="file-preview">
                <VImg
                  v-if="isImage(file.filename)"
                  :src="file.url"
                  cover
                  height="150"
                />
                <div v-else class="file-icon-wrapper">
                  <VIcon :icon="getFileIcon(file.filename)" size="64" />
                </div>
              </div>

              <!-- Dosya Bilgileri -->
              <VCardText>
                <div class="text-caption text-truncate" :title="file.filename">
                  {{ file.filename }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatFileSize(file.size) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ new Date(file.createdAt).toLocaleDateString('tr-TR') }}
                </div>
              </VCardText>

              <!-- Aksiyonlar -->
              <VCardActions>
                <VBtn
                  size="small"
                  variant="text"
                  icon="mdi-content-copy"
                  @click="copyToClipboard(file.url)"
                  title="URL'yi Kopyala"
                />
                <VBtn
                  size="small"
                  variant="text"
                  icon="mdi-open-in-new"
                  :href="file.url"
                  target="_blank"
                  title="Aç"
                />
                <VSpacer />
                <VBtn
                  size="small"
                  variant="text"
                  icon="mdi-delete"
                  color="error"
                  @click="deleteFile(file.filename)"
                  title="Sil"
                />
              </VCardActions>
            </VCard>
          </VCol>
        </VRow>

        <!-- Boş Durum -->
        <VAlert
          v-if="!loading && filteredFiles.length === 0"
          type="info"
          variant="tonal"
        >
          {{ searchQuery ? 'Dosya bulunamadı' : 'Henüz dosya yüklenmemiş' }}
        </VAlert>
      </VCardText>
    </VCard>

    <!-- Upload Dialog -->
    <VDialog v-model="uploadDialog" max-width="600">
      <VCard>
        <VCardTitle>Dosya Yükle</VCardTitle>
        <VCardText>
          <input
            ref="fileInput"
            type="file"
            multiple
            style="display: none"
            @change="handleFileUpload"
          />
          
          <VBtn
            block
            size="large"
            variant="outlined"
            prepend-icon="mdi-file-upload"
            @click="fileInput?.click()"
          >
            Dosya Seç
          </VBtn>

          <!-- Yükleme İlerlemesi -->
          <VList v-if="uploadingFiles.length > 0" class="mt-4">
            <VListItem
              v-for="(file, index) in uploadingFiles"
              :key="index"
            >
              <VListItemTitle>{{ file.name }}</VListItemTitle>
              <template #append>
                <VIcon
                  v-if="file.uploaded"
                  icon="mdi-check-circle"
                  color="success"
                />
                <VIcon
                  v-else-if="file.error"
                  icon="mdi-alert-circle"
                  color="error"
                />
                <VProgressCircular v-else indeterminate size="20" />
              </template>
            </VListItem>
          </VList>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="uploadDialog = false">Kapat</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- URL Upload Dialog -->
    <VDialog v-model="urlUploadDialog" max-width="600">
      <VCard>
        <VCardTitle>URL'den Dosya Yükle</VCardTitle>
        <VCardText>
          <VTextField
            v-model="urlInput"
            label="Dosya URL'si"
            placeholder="https://example.com/image.png"
            prepend-inner-icon="mdi-link-variant"
            :disabled="urlUploading"
            :error-messages="urlUploadError ? [urlUploadError] : []"
            @keyup.enter="uploadFromUrl"
            hide-details="auto"
          />
          <div class="text-caption text-medium-emphasis mt-2">
            Desteklenen: Resim, video, PDF, ZIP ve diğer dosya türleri
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="urlUploading"
            @click="urlUploadDialog = false; urlUploadError = ''; urlInput = ''"
          >
            İptal
          </VBtn>
          <VBtn
            color="primary"
            :loading="urlUploading"
            :disabled="!urlInput || urlUploading"
            prepend-icon="mdi-download"
            @click="uploadFromUrl"
          >
            İndir ve Yükle
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.file-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-preview {
  position: relative;
  background: #f5f5f5;
  height: 150px;
}

.file-icon-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

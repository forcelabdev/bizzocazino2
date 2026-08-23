<script setup>
import { exportToXlsx } from "@/utils/exportXlsx"
import { useNotify } from "@/composables/useNotify"

/**
 * Oyun geçmişi tabloları için yeniden kullanılabilir Excel dışa aktarım butonu.
 * Mevcut filtrelerle (arama/tarih) tüm kayıtları tek seferde çeker ve xlsx üretir.
 */
const props = defineProps({
  // Sorgu fonksiyonu: (params) => Promise<any>
  fetchFn: {
    type: Function,
    required: true,
  },
  // Aktif filtre parametreleri (search/startDate/endDate vb.)
  params: {
    type: Object,
    default: () => ({}),
  },
  // Kolon tanımları: [{ header: "Başlık", value: (row) => any }]
  columns: {
    type: Array,
    required: true,
  },
  fileName: {
    type: String,
    default: "oyun-gecmisi",
  },
  sheetName: {
    type: String,
    default: "Oyun Geçmişi",
  },
  // Dışa aktarımda çekilecek maksimum kayıt
  exportLimit: {
    type: Number,
    default: 50000,
  },
})

const { success: notifySuccess, error: notifyError } = useNotify()
const isExporting = ref(false)

// Farklı servis fonksiyonları farklı şekiller döndürebilir:
// - fetchFuturesHistory -> res.data ({ success, data, total })
// - diğerleri -> axios response ({ data: { success, data, total } })
const extractRows = result => {
  if (!result) return []
  if (Array.isArray(result)) return result
  if (Array.isArray(result.data)) return result.data
  if (Array.isArray(result.data?.data)) return result.data.data
  if (Array.isArray(result.rows)) return result.rows

  return []
}

const runExport = async () => {
  if (isExporting.value) return
  isExporting.value = true

  try {
    const result = await props.fetchFn({
      ...props.params,
      page: 1,
      limit: props.exportLimit,
      itemsPerPage: props.exportLimit,
    })

    const list = extractRows(result)

    if (!list.length) {
      notifyError("Dışa aktarılacak kayıt bulunamadı.")

      return
    }

    const rows = list.map(row => {
      const mapped = {}
      props.columns.forEach(col => {
        mapped[col.header] = col.value ? col.value(row) : row[col.key]
      })

      return mapped
    })

    await exportToXlsx({
      rows,
      fileName: props.fileName,
      sheetName: props.sheetName,
    })

    notifySuccess("Kayıtlar başarıyla dışa aktarıldı.")
  } catch (error) {
    console.error("Oyun geçmişi dışa aktarılamadı:", error)
    notifyError("Dışa aktarım sırasında bir hata oluştu.")
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <VBtn
    color="success"
    variant="tonal"
    size="small"
    prepend-icon="tabler-file-spreadsheet"
    :loading="isExporting"
    @click="runExport"
  >
    Excel'e Aktar
  </VBtn>
</template>

<script setup>
import axios from "@axios"
import { computed, ref, watch } from "vue"

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: String,
    default: null,
  },
  startDate: {
    type: String,
    default: null,
  },
  endDate: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(["update:modelValue"])

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value),
})

const loading = ref(false)
const error = ref("")
const detail = ref(null)
const activeTab = ref("manualBonus")

const tabs = [
  { key: "manualBonus", title: "Manuel Bonus", icon: "tabler-gift" },
  { key: "manualBalance", title: "Manuel Bakiye", icon: "tabler-cash" },
  { key: "campaign", title: "Kampanya", icon: "tabler-speakerphone" },
  { key: "flux", title: "Filux", icon: "tabler-coin-bitcoin" },
  { key: "xpayment", title: "xPayment", icon: "tabler-credit-card" },
]

const formatMoney = value => {
  const number = Number(value || 0)

  return `${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

const formatDate = value => {
  if (!value) return "—"

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const fetchDetail = async () => {
  if (!props.userId) return
  loading.value = true
  error.value = ""
  try {
    const res = await axios.get(`/admin/balance-analysis/members/${props.userId}`, {
      params: {
        startDate: props.startDate || undefined,
        endDate: props.endDate || undefined,
      },
    })

    detail.value = res.data.data
  } catch (err) {
    console.error("Üye bakiye detayı alınamadı:", err)
    error.value = err.response?.data?.message || "Üye detayı alınırken bir hata oluştu."
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.userId],
  ([open]) => {
    if (open) {
      activeTab.value = "manualBonus"
      fetchDetail()
    }
  },
)

const tabCount = key => detail.value?.groups?.[key]?.items?.length || 0
const tabTotal = key => detail.value?.groups?.[key]?.total || 0
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="900"
  >
    <VCard>
      <VCardItem>
        <VCardTitle>
          {{ detail?.user?.name || detail?.user?.username || "Üye Detayı" }}
        </VCardTitle>
        <VCardSubtitle v-if="detail?.user?.username">
          @{{ detail.user.username }}
          <span v-if="detail.user.redeemedCode">· Ref: {{ detail.user.redeemedCode }}</span>
        </VCardSubtitle>
        <template #append>
          <VBtn
            icon
            variant="text"
            size="small"
            @click="isOpen = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>
        </template>
      </VCardItem>

      <VCardText>
        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </VAlert>

        <VProgressLinear
          v-if="loading"
          indeterminate
          color="primary"
          class="mb-4"
        />

        <template v-if="detail && !loading">
          <VTabs v-model="activeTab">
            <VTab
              v-for="tab in tabs"
              :key="tab.key"
              :value="tab.key"
            >
              <VIcon
                :icon="tab.icon"
                start
                size="18"
              />
              {{ tab.title }} ({{ tabCount(tab.key) }})
            </VTab>
          </VTabs>

          <VWindow
            v-model="activeTab"
            class="mt-4"
          >
            <VWindowItem
              v-for="tab in ['manualBonus', 'manualBalance']"
              :key="tab"
              :value="tab"
            >
              <VTable
                v-if="tabCount(tab)"
                density="compact"
                class="text-no-wrap"
              >
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Not</th>
                    <th>Admin</th>
                    <th>Tutar</th>
                    <th>Önce → Sonra</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in detail.groups[tab].items"
                    :key="item.id"
                  >
                    <td>{{ item.category || "—" }}</td>
                    <td>{{ item.note || "—" }}</td>
                    <td>{{ item.actorUsername || "—" }}</td>
                    <td class="font-weight-medium text-success">
                      +{{ formatMoney(item.appliedAmount) }}
                    </td>
                    <td>{{ formatMoney(item.balanceBefore) }} → {{ formatMoney(item.balanceAfter) }}</td>
                    <td>{{ formatDate(item.createdAt) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colspan="3"
                      class="font-weight-bold"
                    >
                      Toplam
                    </td>
                    <td class="font-weight-bold text-success">
                      {{ formatMoney(detail.groups[tab].total) }}
                    </td>
                    <td colspan="2" />
                  </tr>
                </tfoot>
              </VTable>
              <p
                v-else
                class="text-medium-emphasis pa-4 text-center"
              >
                Kayıt bulunamadı.
              </p>
            </VWindowItem>

            <VWindowItem value="campaign">
              <VTable
                v-if="tabCount('campaign')"
                density="compact"
                class="text-no-wrap"
              >
                <thead>
                  <tr>
                    <th>Kampanya</th>
                    <th>Mod</th>
                    <th>Tutar</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in detail.groups.campaign.items"
                    :key="item.id"
                  >
                    <td>{{ item.title || "—" }}</td>
                    <td>{{ item.mode === "manual" ? "Manuel" : "Otomatik" }}</td>
                    <td class="font-weight-medium text-success">
                      +{{ formatMoney(item.amount) }}
                    </td>
                    <td>{{ formatDate(item.createdAt) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colspan="2"
                      class="font-weight-bold"
                    >
                      Toplam
                    </td>
                    <td class="font-weight-bold text-success">
                      {{ formatMoney(detail.groups.campaign.total) }}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </VTable>
              <p
                v-else
                class="text-medium-emphasis pa-4 text-center"
              >
                Kayıt bulunamadı.
              </p>
            </VWindowItem>

            <VWindowItem
              v-for="tab in ['flux', 'xpayment']"
              :key="tab"
              :value="tab"
            >
              <VTable
                v-if="tabCount(tab)"
                density="compact"
                class="text-no-wrap"
              >
                <thead>
                  <tr>
                    <th>Tutar</th>
                    <th>Para Birimi</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in detail.groups[tab].items"
                    :key="item.id"
                  >
                    <td class="font-weight-medium text-success">
                      +{{ formatMoney(item.amount) }}
                    </td>
                    <td>{{ item.currency }}</td>
                    <td>
                      <VChip
                        size="small"
                        color="success"
                        variant="tonal"
                      >
                        Onaylandı
                      </VChip>
                    </td>
                    <td>{{ formatDate(item.createdAt) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td class="font-weight-bold">
                      Toplam
                    </td>
                    <td
                      colspan="1"
                      class="font-weight-bold text-success"
                    >
                      {{ formatMoney(detail.groups[tab].total) }}
                    </td>
                    <td colspan="2" />
                  </tr>
                </tfoot>
              </VTable>
              <p
                v-else
                class="text-medium-emphasis pa-4 text-center"
              >
                Kayıt bulunamadı.
              </p>
            </VWindowItem>
          </VWindow>
        </template>
      </VCardText>
    </VCard>
  </VDialog>
</template>

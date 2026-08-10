<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps({
  selectedUserId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const { t } = useI18n()
const userStore = useUserListStore()

const codes = ref([])
const total = ref(0)
const loading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const headers = computed(() => [
  { title: t("mfaCodes.code"), key: "code" },
  { title: t("mfaCodes.methodType"), key: "methodType" },
  { title: t("mfaCodes.scope"), key: "scope" },
  { title: t("mfaCodes.destination"), key: "destination" },
  { title: t("mfaCodes.status"), key: "status" },
  { title: t("mfaCodes.sentAt"), key: "sentAt" },
  { title: t("mfaCodes.expiresAt"), key: "expiresAt" },
  { title: t("mfaCodes.validatedAt"), key: "validatedAt" },
  { title: t("mfaCodes.reportId"), key: "reportId" },
])

const totalPages = computed(() => {
  const pageCount = Math.ceil(total.value / options.value.itemsPerPage)

  return pageCount > 0 ? pageCount : 1
})

const formatDate = value => {
  if (!value)
    return "-"

  return new Date(value).toLocaleString()
}

const resolveScopeLabel = scope => t(`mfaCodes.scopes.${scope}`, scope)
const resolveStatusLabel = status => t(`mfaCodes.statuses.${status}`, status)

const resolveDestination = item => {
  const destination = item.destination || {}

  if (item.methodType === "email") {
    return {
      value: destination.email || "-",
      masked: destination.maskedEmail || "-",
    }
  }

  return {
    value: destination.phone || "-",
    masked: destination.maskedPhone || "-",
  }
}

const resolveStatusColor = status => {
  const colorMap = {
    pending: "warning",
    sent: "info",
    validated: "success",
    expired: "secondary",
    superseded: "secondary",
    failed: "error",
    cancelled: "secondary",
  }

  return colorMap[status] || "secondary"
}

const fetchCodes = async () => {
  if (!props.selectedUserId)
    return

  loading.value = true
  errorMessage.value = ""

  try {
    const response = await userStore.fetchUserMfaCodes(props.selectedUserId, {
      page: options.value.page,
      limit: options.value.itemsPerPage,
    })

    codes.value = response.codes || []
    total.value = response.total || 0
  } catch (error) {
    console.error("MFA codes fetch error:", error)
    codes.value = []
    total.value = 0
    errorMessage.value = error.response?.data?.message || t("mfaCodes.loadFailed")
  } finally {
    loading.value = false
  }
}

const disableMfa = async () => {
  if (!props.selectedUserId)
    return

  const confirmed = window.confirm(t("mfaCodes.disableConfirm"))
  if (!confirmed)
    return

  actionLoading.value = true
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await userStore.disableUserMfa(props.selectedUserId)
    successMessage.value = t("mfaCodes.disableSuccess")
    emit("updated")
    await fetchCodes()
  } catch (error) {
    console.error("Disable MFA error:", error)
    errorMessage.value = error.response?.data?.message || t("mfaCodes.disableFailed")
  } finally {
    actionLoading.value = false
  }
}

watch([() => props.selectedUserId, options], fetchCodes, {
  immediate: true,
  deep: true,
})
</script>

<template>
  <VCard :title="t('mfaCodes.title')">
    <template #append>
      <VBtn
        color="error"
        variant="tonal"
        :loading="actionLoading"
        @click="disableMfa"
      >
        {{ t("mfaCodes.disableAction") }}
      </VBtn>
    </template>

    <VCardText>
      <VAlert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ errorMessage }}
      </VAlert>

      <VAlert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        {{ successMessage }}
      </VAlert>

      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <VTable
        v-if="codes.length"
        class="text-no-wrap"
      >
        <thead>
          <tr>
            <th
              v-for="header in headers"
              :key="header.key"
            >
              {{ header.title }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in codes"
            :key="item._id"
          >
            <td>
              <span class="font-weight-medium">{{ item.code || "-" }}</span>
            </td>

            <td>
              <VChip
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ item.methodType || "sms" }}
              </VChip>
            </td>

            <td>
              {{ resolveScopeLabel(item.scope) }}
            </td>

            <td>
              <div>
                <div class="font-weight-medium">
                  {{ resolveDestination(item).value }}
                </div>
                <small>{{ resolveDestination(item).masked }}</small>
              </div>
            </td>

            <td>
              <VChip
                :color="resolveStatusColor(item.status)"
                size="small"
                variant="tonal"
              >
                {{ resolveStatusLabel(item.status) }}
              </VChip>
            </td>

            <td>{{ formatDate(item.sentAt) }}</td>
            <td>{{ formatDate(item.expiresAt) }}</td>
            <td>{{ formatDate(item.validatedAt) }}</td>
            <td>{{ item.provider?.reportId || "-" }}</td>
          </tr>
        </tbody>
      </VTable>

      <div
        v-else-if="!loading"
        class="text-center text-disabled py-6"
      >
        {{ t("mfaCodes.empty") }}
      </div>

      <div
        v-if="totalPages > 1"
        class="d-flex justify-center mt-4"
      >
        <VPagination
          v-model="options.page"
          :length="totalPages"
        />
      </div>
    </VCardText>
  </VCard>
</template>

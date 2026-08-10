<script setup>
import { useAppAbility } from "@/plugins/casl/useAppAbility"
import { usePermissionStore } from "@/stores/permissionStore"
import {
  clearAdminMfaChallenge,
  persistAdminMfaChallenge,
  persistAdminSession,
  readAdminMfaChallenge,
} from "@/utils/adminAuth"
import axios from "axios"
import { VForm } from "vuetify/components/VForm"

const router = useRouter()
const route = useRoute()
const ability = useAppAbility()
const permissionStore = usePermissionStore()

const BASE_URL = import.meta.env.VITE_API_BASE_URL

const refVForm = ref()
const otpCode = ref("")
const errorMessage = ref("")
const resendErrorMessage = ref("")
const isSubmitting = ref(false)
const isResending = ref(false)
const cooldownRemainingSeconds = ref(0)
const challenge = ref(readAdminMfaChallenge())

let cooldownInterval = null

const maskedDestination = computed(() => challenge.value?.maskedDestination || "")
const deliveryLabel = computed(() => challenge.value?.methodType === "email" ? "email" : "SMS")
const canResend = computed(() => cooldownRemainingSeconds.value <= 0 && !isResending.value)

const startCooldownTicker = () => {
  if (cooldownInterval)
    clearInterval(cooldownInterval)

  cooldownInterval = window.setInterval(() => {
    if (cooldownRemainingSeconds.value <= 0) {
      clearInterval(cooldownInterval)
      cooldownInterval = null

      return
    }

    cooldownRemainingSeconds.value -= 1
  }, 1000)
}

const syncChallengeState = nextChallenge => {
  challenge.value = {
    ...(challenge.value || {}),
    ...nextChallenge,
  }
  cooldownRemainingSeconds.value = Number(nextChallenge?.cooldownRemainingSeconds || 0)
  persistAdminMfaChallenge(challenge.value)
  startCooldownTicker()
}

onMounted(() => {
  if (localStorage.getItem("accessToken")) {
    router.replace("/")

    return
  }

  if (!challenge.value?.challengeId) {
    router.replace("/login")

    return
  }

  cooldownRemainingSeconds.value = Number(challenge.value.cooldownRemainingSeconds || 0)
  startCooldownTicker()
})

onBeforeUnmount(() => {
  if (cooldownInterval)
    clearInterval(cooldownInterval)
})

const submitOtp = async () => {
  if (!challenge.value?.challengeId)
    return router.replace("/login")

  isSubmitting.value = true
  errorMessage.value = ""

  try {
    const response = await axios.post(`${BASE_URL}/auth/mfa/validate-otp`, {
      challengeId: challenge.value.challengeId,
      code: otpCode.value,
    })

    persistAdminSession({
      accessToken: response.data.accessToken,
      userData: response.data.userData,
      userAbilities: response.data.userAbilities,
      userPermissions: response.data.userPermissions,
      ability,
      permissionStore,
    })

    router.replace(route.query.to ? String(route.query.to) : "/")
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "OTP verification failed"
  } finally {
    isSubmitting.value = false
  }
}

const resendOtp = async () => {
  if (!challenge.value?.challengeId || !canResend.value)
    return

  isResending.value = true
  resendErrorMessage.value = ""

  try {
    const response = await axios.post(`${BASE_URL}/auth/mfa/resend-otp`, {
      challengeId: challenge.value.challengeId,
    })

    syncChallengeState(response.data)
  } catch (error) {
    const nextCooldown = error.response?.data?.metadata?.cooldownRemainingSeconds
    if (nextCooldown !== undefined) {
      cooldownRemainingSeconds.value = Number(nextCooldown || 0)
      startCooldownTicker()
    }

    resendErrorMessage.value = error.response?.data?.message || "OTP resend failed"
  } finally {
    isResending.value = false
  }
}

const cancelChallenge = () => {
  clearAdminMfaChallenge()
  router.replace("/login")
}

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (valid)
      submitOtp()
  })
}
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      cols="12"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardItem>
          <VCardTitle>Admin MFA</VCardTitle>
          <VCardSubtitle>
            {{ maskedDestination ? `${deliveryLabel} code sent to ${maskedDestination}` : "Enter the OTP code to finish login" }}
          </VCardSubtitle>
        </VCardItem>

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
            v-if="resendErrorMessage"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            {{ resendErrorMessage }}
          </VAlert>

          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <AppOtpInput @update-otp="otpCode = $event" />

            <div class="d-flex align-center justify-space-between mt-6 mb-4 gap-4 flex-wrap">
              <span class="text-body-2 text-medium-emphasis">
                {{ canResend ? "You can resend the code now" : `Resend available in ${cooldownRemainingSeconds}s` }}
              </span>

              <VBtn
                variant="text"
                :disabled="!canResend"
                :loading="isResending"
                @click="resendOtp"
              >
                Resend OTP
              </VBtn>
            </div>

            <div class="d-flex gap-4">
              <VBtn
                type="submit"
                block
                :loading="isSubmitting"
              >
                Verify Code
              </VBtn>

              <VBtn
                variant="tonal"
                color="secondary"
                @click="cancelChallenge"
              >
                Back
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>

<route lang="yaml">
meta:
  layout: blank
  action: read
  subject: Auth
  redirectIfLoggedIn: true
</route>

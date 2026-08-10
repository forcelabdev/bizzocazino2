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

import { useGenerateImageVariant } from "@core/composable/useGenerateImageVariant"
import authV2LoginIllustrationBorderedDark from "@images/pages/auth-v2-login-illustration-bordered-dark.png"
import authV2LoginIllustrationBorderedLight from "@images/pages/auth-v2-login-illustration-bordered-light.png"
import authV2LoginIllustrationDark from "@images/pages/auth-v2-login-illustration-dark.png"
import authV2LoginIllustrationLight from "@images/pages/auth-v2-login-illustration-light.png"
import authV2MaskDark from "@images/pages/misc-mask-dark.png"
import authV2MaskLight from "@images/pages/misc-mask-light.png"
import { emailValidator, requiredValidator } from "@validators"

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)
const isPasswordVisible = ref(false)
const route = useRoute()
const router = useRouter()
const ability = useAppAbility()
const permissionStore = usePermissionStore()

const errors = ref({
  email: undefined,
  password: undefined,
})

const refVForm = ref()
const email = ref("")
const password = ref("")
const rememberMe = ref(false)
const BASE_URL = import.meta.env.VITE_API_BASE_URL

onMounted(() => {
  if (!localStorage.getItem("accessToken") && readAdminMfaChallenge()) {
    router.replace("/login/mfa")
  }
})

const login = () => {
  axios
    .post(BASE_URL + "/auth/login", {
      email: email.value,
      password: password.value,
    })
    .then(r => {
      if (r.data?.step === "otp") {
        persistAdminMfaChallenge({
          challengeId: r.data.challengeId,
          methodType: r.data.methodType,
          maskedDestination: r.data.maskedDestination,
          cooldownRemainingSeconds: r.data.cooldownRemainingSeconds,
          expiresInSeconds: r.data.expiresInSeconds,
          scope: r.data.scope,
          email: email.value,
        })

        errors.value = {
          email: undefined,
          password: undefined,
        }

        router.replace("/login/mfa")

        return
      }

      const { accessToken, userData, userAbilities, userPermissions } =
				r.data

      persistAdminSession({
        accessToken,
        userData,
        userAbilities,
        userPermissions,
        ability,
        permissionStore,
      })

      // Redirect to `to` query if exist or redirect to index route
      router.replace(route.query.to ? String(route.query.to) : "/")
    })
    .catch(e => {
      clearAdminMfaChallenge()

      const formErrors = e.response?.data?.errors || {}
      if (!formErrors.email)
        formErrors.email = [e.response?.data?.message || "Login failed. Please check credentials."]
      errors.value = formErrors
    })
}

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid) login()
  })
}
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      lg="8"
      class="d-none d-lg-flex"
    >
      <div class="position-relative bg-background rounded-lg w-100 ma-8 me-0">
        <div class="d-flex align-center justify-center w-100 h-100">
          <VImg
            max-width="505"
            :src="authThemeImg"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <VImg
          :src="authThemeMask"
          class="auth-footer-mask"
        />
      </div>
    </VCol>

    <VCol
      cols="12"
      lg="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  label="Email"
                  type="email"
                  autofocus
                  :rules="[requiredValidator, emailValidator]"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="password"
                  label="Password"
                  :rules="[requiredValidator]"
                  :type="
                    isPasswordVisible ? 'text' : 'password'
                  "
                  :error-messages="errors.password"
                  :append-inner-icon="
                    isPasswordVisible
                      ? 'tabler-eye-off'
                      : 'tabler-eye'
                  "
                  @click:append-inner="
                    isPasswordVisible = !isPasswordVisible
                  "
                />

                <VBtn
                  block
                  type="submit"
                >
                  Login
                </VBtn>
              </VCol>
            </VRow>
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

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

import logo from "@images/logo.svg?raw"
import { emailValidator, requiredValidator } from "@validators"

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
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ""

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
      cols="12"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <div class="auth-brand">
            <div
              class="auth-brand-logo"
              v-html="logo"
            />
            <h1 class="auth-brand-title">
              Forcelab Backoffice
            </h1>
            <div class="auth-brand-meta">
              <span class="auth-brand-chip">Bizzocasino</span>
              <span class="auth-brand-chip auth-brand-chip--muted">Proje No: 3</span>
            </div>
          </div>

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

.auth-brand {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-block-end: 1.75rem;
	text-align: center;
}

.auth-brand-logo {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-block-end: 1rem;
	color: rgb(var(--v-global-theme-primary));
	line-height: 0;

	:deep(svg) {
		inline-size: 42px;
		block-size: 42px;
	}
}

.auth-brand-title {
	margin-block-end: 0.625rem;
	font-size: 1.375rem;
	font-weight: 600;
	letter-spacing: 0.01em;
}

.auth-brand-meta {
	display: flex;
	align-items: center;
	gap: 0.375rem;
}

.auth-brand-chip {
	border-radius: 0.5rem;
	background-color: rgba(var(--v-theme-primary), 0.16);
	color: rgb(var(--v-theme-primary));
	font-size: 0.75rem;
	font-weight: 500;
	letter-spacing: 0.02em;
	line-height: 1.7;
	padding-block: 0.0625rem;
	padding-inline: 0.5rem;

	&--muted {
		background-color: rgba(var(--v-theme-on-surface), 0.08);
		color: rgba(var(--v-theme-on-surface), 0.7);
	}
}
</style>

<route lang="yaml">
meta:
    layout: blank
    action: read
    subject: Auth
    redirectIfLoggedIn: true
</route>

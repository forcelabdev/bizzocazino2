<script setup>
import { useUserListStore } from '@/views/apps/user/useUserListStore'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()

const route = useRoute()
const userId = route.params.id
const userStore = useUserListStore()

const newPassword = ref('')
const confirmPassword = ref('')
const isNewPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const isTwoFactorDialogOpen = ref(false)
const smsVerificationNumber = ref('')
const currentAdminData = JSON.parse(localStorage.getItem('userData') || '{}')
const canToggleEmailVerification = currentAdminData.isSuperAdmin === true

const userData = ref({})

const fetchUser = async () => {
  const res = await userStore.fetchUser(userId)
  userData.value = res.data.data
  smsVerificationNumber.value = res.data.data.phone || ''
}
fetchUser()

const updatePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    alert(t('passwordsDoNotMatch'))
    return
  }
  try {
    await userStore.editUser(userId, {
      local: { password: newPassword.value },
    })
    alert(t('passwordUpdated'))
  } catch (err) {
    console.error(err)
    alert(t('passwordUpdateFailed'))
  }
}

const toggleEmailVerification = async () => {
  try {
    await userStore.editUser(userId, {
      local: {
        emailVerified: !userData.value.local?.emailVerified,
        email: userData.value.local?.email,
      },
    })
    userData.value.local.emailVerified = !userData.value.local.emailVerified
  } catch (err) {
    console.error(err)
    alert(err.response?.data?.message || t('updateFailed'))
  }
}

const toggleIdentityVerification = async () => {
  try {
    await userStore.editUser(userId, {
      identity: {
        verified: !userData.value.identity?.verified,
        idNumber: userData.value.identity?.idNumber || '',
      },
    })
    userData.value.identity.verified = !userData.value.identity.verified
  } catch (err) {
    console.error(err)
    alert(err.response?.data?.message || t('updateFailed'))
  }
}
</script>

<template>
  <VRow>
    <!-- Change Password -->
    <VCol cols="12">
      <VCard :title="t('changePassword')">
        <VCardText>
          <VAlert variant="tonal" color="warning" class="mb-4">
            <VAlertTitle class="mb-2">
              {{ t('passwordRequirements') }}
            </VAlertTitle>
            <span>{{ t('passwordRequirementsText') }}</span>
          </VAlert>

          <VForm @submit.prevent="updatePassword">
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model="newPassword"
                  :label="t('newPassword')"
                  :type="isNewPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isNewPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isNewPasswordVisible = !isNewPasswordVisible"
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model="confirmPassword"
                  :label="t('confirmPassword')"
                  :type="isConfirmPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isConfirmPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                />
              </VCol>
              <VCol cols="12">
                <VBtn type="submit">
                  {{ t('changePassword') }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Verify Email -->
    <VCol cols="12" md="6">
      <VAlert :color="userData.local?.emailVerified ? 'success' : 'error'" variant="tonal">
        <template #title>
          {{ t('verifyEmail') }}
        </template>
        <span>
          {{ userData.local?.emailVerified ? t('emailVerified') : t('emailNotVerified') }}
        </span>
        <template #append>
          <VBtn size="small" variant="tonal" :disabled="!canToggleEmailVerification" @click="toggleEmailVerification">
            {{ userData.local?.emailVerified ? t('revoke') : t('verify') }}
          </VBtn>
        </template>
      </VAlert>
    </VCol>

    <!-- Verify Identity -->
    <VCol cols="12" md="6">
      <VAlert :color="userData.identity?.verified ? 'success' : 'error'" variant="tonal">
        <template #title>
          {{ t('verifyIdentity') }}
        </template>
        <span>
          {{ userData.identity?.verified ? t('identityVerified') : t('identityNotVerified') }}
        </span>
        <template #append>
          <VBtn size="small" variant="tonal" @click="toggleIdentityVerification">
            {{ userData.identity?.verified ? t('revoke') : t('verify') }}
          </VBtn>
        </template>
      </VAlert>
    </VCol>

    <!-- Two-step verification -->
    <VCol cols="12">
      <VCard :title="t('twoStepVerification')">
        <template #subtitle>
          <span class="text-base">{{ t('twoStepVerificationText') }}</span>
        </template>
        <VCardText>
          <h4 class="font-weight-medium">SMS</h4>
          <AppTextField :model-value="userData.phone" readonly>
            <template #append-inner>
              <div class="d-flex align-center gap-2">
                <VIcon icon="tabler-edit" size="22" @click="isTwoFactorDialogOpen = true" />
                <VIcon icon="tabler-trash" size="22" />
              </div>
            </template>
          </AppTextField>
        </VCardText>
      </VCard>
    </VCol>

    <TwoFactorAuthDialog
      v-model:isDialogVisible="isTwoFactorDialogOpen"
      :sms-code="smsVerificationNumber"
    />
  </VRow>
</template>

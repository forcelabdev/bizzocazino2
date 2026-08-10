<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import {
  emailValidator,
  requiredValidator,
  passwordValidator,
} from '@validators'

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:isDrawerOpen', 'userData'])

const isFormValid = ref(false)
const refForm = ref()

const fullName = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const phone = ref('')
const birthday = ref('')
const role = ref('user') // default rank

const closeNavigationDrawer = () => {
  emit('update:isDrawerOpen', false)
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      emit('userData', {
        name: fullName.value,
        username: username.value,
        email: email.value,
        password: password.value,
        phone: phone.value,
        birthday: birthday.value || null,
        rank: role.value,
      })
      emit('update:isDrawerOpen', false)
      nextTick(() => {
        refForm.value?.reset()
        refForm.value?.resetValidation()
      })
    }
  })
}

const handleDrawerModelValueUpdate = val => {
  emit('update:isDrawerOpen', val)
}
</script>


<template>
  <VNavigationDrawer
    temporary
    :model-value="props.isDrawerOpen"
    location="end"
    width="400"
    class="scrollable-content"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <!-- 👉 Drawer Header -->
    <AppDrawerHeaderSection
      title="Add User"
      @cancel="closeNavigationDrawer"
    />

    <!-- 👉 Scrollable Drawer Content -->
    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- 👉 Form -->
          <VForm
            ref="refForm"
            v-model="isFormValid"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- Full Name -->
              <VCol cols="12">
                <AppTextField
                  v-model="fullName"
                  :rules="[requiredValidator]"
                  label="Full Name"
                />
              </VCol>

              <!-- Username -->
              <VCol cols="12">
                <AppTextField
                  v-model="username"
                  :rules="[requiredValidator]"
                  label="Username"
                />
              </VCol>

              <!-- Email -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  :rules="[requiredValidator, emailValidator]"
                  label="Email"
                />
              </VCol>

              <!-- Password -->
              <VCol cols="12">
                <AppTextField
                  v-model="password"
                  type="password"
                  :rules="[requiredValidator]"
                  label="Password"
                />
              </VCol>

              <!-- Phone -->
              <VCol cols="12">
                <AppTextField
                  v-model="phone"
                  type="tel"
                  :rules="[requiredValidator]"
                  label="Phone"
                />
              </VCol>

              <!-- Birthday -->
              <VCol cols="12">
                <AppTextField
                  v-model="birthday"
                  type="date"
                  label="Birthday"
                />
              </VCol>

              <!-- Rank -->
              <VCol cols="12">
                <AppSelect
                  v-model="role"
                  label="Select Rank"
                  :rules="[requiredValidator]"
                  :items="['user', 'admin', 'partner']"
                  clearable
                />
              </VCol>

              <!-- Submit + Cancel -->
              <VCol
                cols="12"
                class="d-flex justify-end gap-3"
              >
                <VBtn type="submit">
                  Submit
                </VBtn>
                <VBtn
                  type="reset"
                  variant="tonal"
                  color="secondary"
                  @click="closeNavigationDrawer"
                >
                  Cancel
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>

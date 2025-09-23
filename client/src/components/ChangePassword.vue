<script setup lang="ts">
import { trpc } from '@/trpc'
import { ref, computed } from 'vue'
import PageForm from '@/components/PageForm.vue'
import { FwbInput, FwbButton, FwbAlert } from 'flowbite-vue'
import StdFooter from '@/components/StdFooter.vue'
import AlertMessages from '@/components/AlertMessages.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import { useUserAuthStore } from '@/stores/userAuthStore'

const changePasswordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})

const hasSucceeded = ref(false)

const passwordMatch = computed(() => {
  const { newPassword, confirmNewPassword } = changePasswordForm.value
  if (!newPassword || !confirmNewPassword) return undefined
  return newPassword === confirmNewPassword ? 'success' : 'error'
})

// function, which creates an error message ref and handles the try/catch block
const [changePassword, errorMessage] = useErrorMessage(async () => {
  if (changePasswordForm.value.newPassword !== changePasswordForm.value.confirmNewPassword)
    throw new Error('New Password and Confirmed password need to match')

  await trpc.user.changePassword.mutate(changePasswordForm.value)

  hasSucceeded.value = true

  const userAuthStore = useUserAuthStore()

  userAuthStore.logout()
})
</script>

<template>
  <PageForm heading="Change users password" formLabel="changePassword" @submit="changePassword">
    <template #default>
      <FwbInput
        label="Old Password"
        id="oldPassword"
        name="oldPassword"
        type="password"
        v-model="changePasswordForm.oldPassword"
        :required="true"
      />

      <FwbInput
        label="New Password"
        id="newPassword"
        name="newPassword"
        type="password"
        v-model="changePasswordForm.newPassword"
        :required="true"
      />

      <FwbInput
        label="Confirm new Password"
        id="confirmNewPassword"
        name="confirmNewPassword"
        type="password"
        v-model="changePasswordForm.confirmNewPassword"
        :required="true"
        :validation-status="passwordMatch"
      />

      <AlertMessages
        :showSuccess="hasSucceeded"
        successMessage="You have successfully changed the password. You have been logged out. Please login again."
        :errorMessage="errorMessage"
      />

      <div class="grid">
        <FwbButton color="default" type="submit" size="xl">Change Password</FwbButton>
      </div>
    </template>

    <template #footer>
      <FwbAlert class="bg-transparent text-center">
        <StdFooter :message="''" />
      </FwbAlert>
    </template>
  </PageForm>
</template>

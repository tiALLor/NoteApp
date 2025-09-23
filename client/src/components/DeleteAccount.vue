<script setup lang="ts">
import { trpc } from '@/trpc'
import { ref } from 'vue'
import PageForm from '@/components/PageForm.vue'
import { FwbInput, FwbButton, FwbAlert } from 'flowbite-vue'
import StdFooter from '@/components/StdFooter.vue'
import AlertMessages from '@/components/AlertMessages.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import { useUserAuthStore } from '@/stores/userAuthStore'

const confirmWithPasswordForm = ref({
  password: '',
  newPassword: '',
  confirmNewPassword: '',
})

const hasSucceeded = ref(false)

// function, which creates an error message ref and handles the try/catch block
const [deleteAccount, errorMessage] = useErrorMessage(async () => {
  await trpc.user.removeUser.mutate(confirmWithPasswordForm.value)

  hasSucceeded.value = true

  const userAuthStore = useUserAuthStore()

  userAuthStore.logout()
})
</script>

<template>
  <PageForm heading="Confirmation" formLabel="deleteAccount" @submit="deleteAccount">
    <template #default>
      <FwbInput
        label="password"
        id="password"
        name="password"
        type="password"
        v-model="confirmWithPasswordForm.password"
        :required="true"
      />

      <AlertMessages
        :showSuccess="hasSucceeded"
        successMessage="You have successfully deleted the account. You have been logged out."
        :errorMessage="errorMessage"
      />

      <div class="grid">
        <FwbButton color="default" type="submit" size="xl">Delete account</FwbButton>
      </div>
    </template>

    <template #footer>
      <FwbAlert class="bg-transparent text-center">
        <StdFooter :message="''" />
      </FwbAlert>
    </template>
  </PageForm>
</template>

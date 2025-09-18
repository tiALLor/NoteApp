<script setup lang="ts">
import { trpc } from '@/trpc'
import { ref } from 'vue'
import PageForm from '@/components/PageForm.vue'
import { FwbAlert, FwbInput, FwbSelect, FwbButton } from 'flowbite-vue'
import StdFooter from '@/components/StdFooter.vue'
import AlertMessages from '@/components/AlertMessages.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import type { EntityRole } from '@server/shared/types'

const ROLES = ['admin', 'chef', 'user'] as const

const roles = ROLES.map((role) => ({
  value: role,
  name: role.charAt(0).toUpperCase() + role.slice(1),
}))

const userForm = ref({
  email: '',
  password: '',
  name: '',
  roleName: '',
})

const hasSucceeded = ref(false)

// function, which creates an error message ref and handles the try/catch block
const [submitCreateUser, errorMessage] = useErrorMessage(async () => {
  await trpc.user.createUser.mutate({
    ...userForm.value,
    roleName: userForm.value.roleName as EntityRole,
  })

  hasSucceeded.value = true
})
</script>

<template>
  <PageForm
    heading="Create user account for cantina use"
    formLabel="Create"
    @submit="submitCreateUser"
  >
    <template #default>
      <FwbInput
        data-testid="name"
        label="User Name"
        type="text"
        v-model="userForm.name"
        :required="true"
      />

      <FwbInput
        label="Email"
        type="email"
        autocomplete="username"
        v-model="userForm.email"
        :required="true"
      />

      <FwbInput
        label="Password"
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        v-model="userForm.password"
        :required="true"
      />

      <FwbSelect
        data-testid="roleName"
        :options="roles"
        label="Select users role"
        v-model="userForm.roleName"
        :required="true"
      />

      <AlertMessages
        :showSuccess="hasSucceeded"
        successMessage="You have successfully created a new user."
        :errorMessage="errorMessage"
      />

      <div class="grid">
        <FwbButton color="default" type="submit" size="xl">Create</FwbButton>
      </div>
    </template>

    <template #footer>
      <FwbAlert class="bg-transparent text-center">
        <StdFooter :message="'Create another user or go'" />
      </FwbAlert>
    </template>
  </PageForm>
</template>

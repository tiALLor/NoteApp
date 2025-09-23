<script setup lang="ts">
import { useUserAuthStore } from '@/stores/userAuthStore'
import { ref } from 'vue'
import PageForm from '@/components/PageForm.vue'
import { FwbAlert, FwbButton, FwbInput } from 'flowbite-vue'
import AlertError from '@/components/AlertError.vue'
import useErrorMessage from '@/composables/useErrorMessage'

const userForm = ref({
  email: '',
  password: '',
  userName: '',
})

const hasSucceeded = ref(false)

// function, which creates an error message ref and handles the try/catch block
const [submitSignup, errorMessage] = useErrorMessage(async () => {
  const userAuthStore = useUserAuthStore()
  const user = await userAuthStore.signup(userForm.value)
  if (user) hasSucceeded.value = true
})
</script>

<template>
  <PageForm heading="Sign up for an account" formLabel="Signup" @submit="submitSignup">
    <template #default>
      <FwbInput
        data-testid="name"
        label="User Name"
        type="text"
        v-model="userForm.userName"
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

      <FwbAlert v-if="hasSucceeded" data-testid="successMessage" type="success">
        You have successfully signed up! You can now log in.
        <RouterLink
          to="/login"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >Go to the login page</RouterLink
        >
      </FwbAlert>
      <AlertError :message="errorMessage">
        {{ errorMessage }}
      </AlertError>

      <div class="grid">
        <FwbButton color="default" type="submit" size="xl">Sign up</FwbButton>
      </div>
    </template>

    <template #footer>
      <FwbAlert class="bg-transparent text-center">
        Already a member?
        {{ ' ' }}
        <RouterLink
          to="/login"
          class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >Log in</RouterLink
        >
        <br />
        or go
        <RouterLink to="/" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
          back home
        </RouterLink>
      </FwbAlert>
    </template>
  </PageForm>
</template>

<script setup lang="ts">
import { FwbNavbarLink, FwbButton } from 'flowbite-vue'
import StackedLayout from './StackedLayout.vue'
import { useUserAuthStore } from '@/stores/userAuthStore'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const userAuthStore = useUserAuthStore()

const links = computed(() => [
  { label: 'Home', name: 'Home' },

  ...(userAuthStore.isAuthenticated
    ? [
        { label: 'Account settings', name: 'AccountSettings' },
      ]
    : [
        { label: 'Login', name: 'Login' },
        { label: 'Signup', name: 'Signup' },
      ]),
])

function logoutUser() {
  userAuthStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <StackedLayout :links="links">
    <template #menu>
      <FwbNavbarLink v-if="userAuthStore.isAuthenticated" @click.prevent="logoutUser" link="#"
        >Logout</FwbNavbarLink
      >
    </template>
    <template #right-side>
      <fwb-button v-if="userAuthStore.isAuthenticated" @click.prevent="logoutUser"
        >Logout</fwb-button
      >
    </template>
  </StackedLayout>
</template>

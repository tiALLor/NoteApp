<script setup lang="ts">
import { FwbNavbarLink, FwbButton } from 'flowbite-vue'
import StackedLayout from './StackedLayout.vue'
import { useUserAuthStore } from '@/stores/user'
import { logout } from '@/utils/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const userAuthStore = useUserAuthStore()

const links = computed(() => [
  { label: 'Home', name: 'Home' },

  ...(userAuthStore.authUser?.roleName === 'admin'
    ? [{ label: 'Create user', name: 'CreateUser' }]
    : []),

  ...(userAuthStore.authUser?.roleName === 'chef'
    ? [
        { label: 'Meal', name: 'Meal' },
        { label: 'Menu', name: 'Menu' },
      ]
    : []),

  ...(userAuthStore.isLoggedIn
    ? [
        { label: 'Your orders', name: 'OrderSummary' },
        { label: 'Account settings', name: 'AccountSettings' },
      ]
    : [
        { label: 'Login', name: 'Login' },
        { label: 'Signup', name: 'Signup' },
      ]),
])

function logoutUser() {
  logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <StackedLayout :links="links">
    <template #menu>
      <FwbNavbarLink v-if="userAuthStore.isLoggedIn" @click.prevent="logoutUser" link="#"
        >Logout</FwbNavbarLink
      >
    </template>
    <template #right-side>
      <fwb-button v-if="userAuthStore.isLoggedIn" @click.prevent="logoutUser">Logout</fwb-button>
    </template>
  </StackedLayout>
</template>

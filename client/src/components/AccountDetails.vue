<script setup lang="ts">
import { useUserAuthStore } from '@/stores/user'

const userAuthStore = useUserAuthStore()
</script>

<template>
  <div class="lg:w-1/2">
    <h2 class="text-4xl font-bold text-gray-800 dark:text-gray-100">
      {{ userAuthStore.authUser?.name }}
      <br />
      logged as {{ userAuthStore.authUser?.roleName }}
    </h2>
  </div>
</template>

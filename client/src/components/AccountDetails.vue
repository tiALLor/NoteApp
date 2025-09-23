<script setup lang="ts">
import { useUserAuthStore } from '@/stores/userAuthStore'

const userAuthStore = useUserAuthStore()
</script>

<template>
  <div class="lg:w-1/2">
    <h2 class="text-4xl font-bold text-gray-800 dark:text-gray-100">
      {{ userAuthStore.authUser?.userName }}
      <br />
    </h2>
  </div>
</template>

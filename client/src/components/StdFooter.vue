<script setup lang="ts">
import { FwbAlert } from 'flowbite-vue'

defineProps<{
  message: string
}>()
</script>

<template>
  <FwbAlert class="bg-transparent text-center">
    Create another user or go
    <RouterLink to="/" class="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
      back home
    </RouterLink>
  </FwbAlert>
</template>

<script setup lang="ts">
import { FwbAlert } from 'flowbite-vue'

defineProps<{
  successMessage?: string
  errorMessage?: string
  showSuccess?: boolean
}>()
</script>

<template>
  <FwbAlert v-if="showSuccess && successMessage" data-testid="successMessage" type="success">
    {{ successMessage }}
  </FwbAlert>

  <FwbAlert v-if="errorMessage" data-testid="errorMessage" type="danger">
    {{ errorMessage }}
  </FwbAlert>
</template>

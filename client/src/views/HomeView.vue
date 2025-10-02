<script setup lang="ts">
import { ref } from 'vue'
import { FwbButton, FwbTab, FwbTabs } from 'flowbite-vue'
import { useUserAuthStore } from '@/stores/userAuthStore'
import NoteService from '@/components/NoteService.vue'


//TODO cleanup imports
const userAuthStore = useUserAuthStore()
</script>

<template>
  <div v-if="!userAuthStore.isAuthenticated" aria-label="home unauthorized">
    <div>Note app</div>
    <div>
      <p class="mt-4 text-gray-500 dark:text-gray-400 lg:max-w-md">
        If you have a account please login.
      </p>
      <div class="mt-6 flex items-center gap-2">
        <FwbButton component="RouterLink" tag="router-link" href="/signup">Sign up</FwbButton>
        <FwbButton component="RouterLink" tag="router-link" color="alternative" href="/login">
          Log in
        </FwbButton>
      </div>
    </div>
  </div>
  <div v-if="userAuthStore.isAuthenticated">
    <NoteService />
  </div>
</template>

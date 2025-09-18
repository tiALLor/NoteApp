<script setup lang="ts">
import { ref } from 'vue'
import { FwbTab, FwbTabs } from 'flowbite-vue'
import ChangePassword from '@/components/ChangePassword.vue'
import DeleteAccount from '@/components/DeleteAccount.vue'
import AccountDetails from '@/components/AccountDetails.vue'

const activeTab = ref('first')
</script>

<template>
  <AccountDetails />
  <fwb-tabs v-model="activeTab" variant="underline" class="p-5">
    <fwb-tab name="first" title="Change Password">
      <ChangePassword />
    </fwb-tab>
    <fwb-tab name="second" title="Delete account">
      <div class="lg:w-1/2">
        <h2 class="text-4xl font-bold text-gray-800 dark:text-gray-100">Delete account</h2>
        <p class="mt-4 text-2xl text-red-500 dark:text-red-400 lg:max-w-md">
          Attention: You can delete only a account without orders or a order history.
        </p>
      </div>
      <DeleteAccount />
    </fwb-tab>
  </fwb-tabs>
</template>

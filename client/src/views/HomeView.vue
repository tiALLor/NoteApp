<script setup lang="ts">
import { ref } from 'vue'
import { FwbButton, FwbTab, FwbTabs } from 'flowbite-vue'
import { addDays, format } from 'date-fns'
import Calendar from '@/components/Calendar.vue'
import MenuTable from '@/components/MenuTable.vue'
import OrderTable from '@/components/OrderTable.vue'
import { useUserAuthStore } from '@/stores/user'
import type { MealType } from '@server/shared/types'

const userAuthStore = useUserAuthStore()

type tab = {
  name: string
  title: string
  mealType: MealType
}

const tabs: tab[] = [
  { name: 'soup', title: 'Soups', mealType: 'soup' },
  { name: 'main', title: 'Mains', mealType: 'main' },
]

const activeTab = ref('soup')

const date = ref(addDays(new Date(), 1))
const minDate = ref(undefined)
const maxDate = ref(undefined)
</script>

<template>
  <div class="flex items-center justify-center">
    <div class="lg:w-1/2">
      <Calendar
        :date="date"
        :minDate="minDate"
        :maxDate="maxDate"
        mode="date"
        @dateUpdated="(newDate) => (date = newDate)"
      />
    </div>
  </div>
  <div class="py-3 lg:w-1/2">
    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
      Our menu for {{ format(date, 'yyyy-MM-dd') }}:
    </h2>
  </div>
  <div v-if="!userAuthStore.isLoggedIn" aria-label="our menu">
    <div>
      <fwb-tabs v-model="activeTab" variant="underline" class="p-5">
        <fwb-tab v-for="tab in tabs" :key="tab.title" :name="tab.name" :title="tab.title">
          <MenuTable :type="tab.mealType" :date="date" />
        </fwb-tab>
      </fwb-tabs>
    </div>
    <div>
      <p class="mt-4 text-gray-500 dark:text-gray-400 lg:max-w-md">
        Hi! Like our cuisine? Sign up and order a menu from our Cantina. If you have a account
        please login.
      </p>
      <div class="mt-6 flex items-center gap-2">
        <FwbButton component="RouterLink" tag="router-link" href="/signup">Sign up</FwbButton>
        <FwbButton component="RouterLink" tag="router-link" color="alternative" href="/login">
          Log in
        </FwbButton>
      </div>
    </div>
  </div>
  <div v-if="userAuthStore.isLoggedIn">
    <OrderTable :date="date" />
  </div>
</template>

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthUserWithRoleName } from '@server/shared/types'

export const useUserAuthStore = defineStore('auth', () => {
  const authToken = ref<string | null>(null)
  const authUser = ref<AuthUserWithRoleName | null>(null)

  const isLoggedIn = computed(() => !!authToken.value)

  function storeTokenAndUser(token: string | null, user: AuthUserWithRoleName | null) {
    authToken.value = token
    authUser.value = user
  }

  function clearTokenAndUser() {
    authToken.value = null
    authUser.value = null
  }

  return {
    authToken,
    authUser,
    isLoggedIn,
    storeTokenAndUser,
    clearTokenAndUser,
  }
})

import { useUserAuthStore } from '@/stores/userAuthStore'

export const authenticateUser = () => {
  const userAuthStore = useUserAuthStore()

  if (!userAuthStore.isAuthenticated) return { name: 'Login' }

  return true
}

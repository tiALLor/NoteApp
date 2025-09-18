import { useUserAuthStore } from '@/stores/user'

export const authenticateUser = () => {
  const userAuthStore = useUserAuthStore()

  if (!userAuthStore.isLoggedIn) return { name: 'Login' }

  return true
}

export const authenticateChef = () => {
  const userAuthStore = useUserAuthStore()

  if (!userAuthStore.isLoggedIn) return { name: 'Login' }

  if (userAuthStore.authUser?.roleName !== 'chef') return { name: 'Menu' }

  return true
}

export const authenticateAdmin = () => {
  const userAuthStore = useUserAuthStore()
  if (!userAuthStore.isLoggedIn) return { name: 'Login' }

  if (userAuthStore.authUser?.roleName !== 'admin') return { name: 'Menu' }

  return true
}

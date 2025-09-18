import { trpc } from '@/trpc'
import { jwtDecode } from 'jwt-decode'
import type { AuthUserWithRoleName, UserInsertable } from '@server/shared/types'
import { useUserAuthStore } from '@/stores/user'

// Defines the shape of JWT payload
type JwtPayload = {
  user: AuthUserWithRoleName
  exp?: number
  iat?: number
}

export async function signup(userForm: UserInsertable): Promise<void> {
  await trpc.user.signup.mutate(userForm)
}

export async function login(userLogin: { email: string; password: string }) {
  const result = await trpc.user.login.mutate(userLogin)
  const authToken = result.accessToken
  const userAuthStore = useUserAuthStore()

  if (!authToken) {
    throw new Error('Login failed: No token returned.')
  }

  try {
    // const payload = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString())
    const decodedPayload = jwtDecode<JwtPayload>(authToken)

    if (!decodedPayload?.user) {
      throw new Error('Token does not contain valid user data.')
    }
    if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
      throw new Error('Authentication token has expired.')
    }

    userAuthStore.storeTokenAndUser(authToken, decodedPayload.user)
  } catch (error) {
    userAuthStore.storeTokenAndUser(null, null)
    
    console.error('JWT decoding failed', error)
    throw new Error('Failed to decode authentication token.')
  }
}

export function logout() {
  const userAuthStore = useUserAuthStore()
  userAuthStore.clearTokenAndUser()
}

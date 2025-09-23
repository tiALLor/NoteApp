import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@server/shared/trpc'
import { apiBase } from '@/config'
import SuperJSON from 'superjson'
import { useUserAuthStore } from '@/stores/userAuthStore'

export const trpc = createTRPCProxyClient<AppRouter>({
  // auto convert Date <-> string
  transformer: SuperJSON,
  links: [
    httpBatchLink({
      url: apiBase,
      // credentials: 'include',

      // send the access token with every request
      headers: () => {
        // attach the access token to the request Authorization header
        const userAuthStore = useUserAuthStore()
        const accessToken = userAuthStore.accessToken
        return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      },

      // Handle token refresh on 401
      async fetch(url, options) {
        const parsedUrl = new URL(url.toString())
        const isRefreshCall = parsedUrl.pathname === '/api/v1/trpc/user.refreshToken'
        const isLoginCall = parsedUrl.pathname === '/api/v1/trpc/user.login'

        const requestOptions = {
          ...options,
          credentials: 'include' as RequestCredentials,
        }
        const response = await fetch(url, requestOptions)

        if (response.status === 401 && !isRefreshCall && !isLoginCall) {
          const userAuthStore = useUserAuthStore()
          try {
            await userAuthStore.refreshToken()

            const newOptions = {
              ...options,
              headers: {
                ...options?.headers,
                Authorization: `Bearer ${userAuthStore.accessToken}`,
              },
            }
            return fetch(url, newOptions)
          } catch (error) {
            userAuthStore.logout()
            window.location.href = '/login'
            // throw error
            console.log(error)
          }
        }

        return response
      },
    }),
  ],
})

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@server/shared/trpc'
import { apiBase } from '@/config'
import SuperJSON from 'superjson'
import { useUserAuthStore } from '@/stores/user'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: apiBase,
      // auto convert Date <-> string
      transformer: SuperJSON,

      // send the access token with every request
      headers: () => {
        // attach the access token to the request Authorization header
        const userAuthStore = useUserAuthStore()
        const accessToken = userAuthStore.authToken
        return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      },
    }),
  ],
})

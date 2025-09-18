/// <reference types="vite/client" />

interface Window {
  __AUTH_STORE__?: ReturnType<typeof useUserAuthStore>
}

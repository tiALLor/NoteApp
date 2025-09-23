import './assets/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useUserAuthStore } from './stores/userAuthStore'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

const mode =
  import.meta.env.MODE ||
  import.meta.env.VITE_MODE || // fallback from env
  process.env.NODE_ENV ||
  'production'

if (typeof window !== 'undefined' && ['development', 'test'].includes(mode)) {
  const store = useUserAuthStore()

  if (!('__AUTH_STORE__' in window)) {
    ;(window as any).__AUTH_STORE__ = store
  }
}

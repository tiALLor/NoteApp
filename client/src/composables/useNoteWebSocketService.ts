import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUserAuthStore } from '../stores/userAuthStore'
import { NoteWebSocketService } from '../services/noteWebSocketService'

const wsInstance = ref<NoteWebSocketService | null>(null)

export function useWebSocketService() {
  const authStore = useUserAuthStore()

  if (!wsInstance.value) {
    wsInstance.value = new NoteWebSocketService(() => authStore.accessToken)
  }

  onMounted(() => {
    if (
      authStore.isAuthenticated &&
      wsInstance.value &&
      !wsInstance.value?.isConnected &&
      wsInstance.value?.ws?.readyState !== WebSocket.OPEN
    ) {
      wsInstance.value.connect()
    }
  })

  onUnmounted(() => {
    if (wsInstance.value) {
      wsInstance.value.disconnect()
      wsInstance.value = null
    }
  })

  return {
    ws: wsInstance,
    isConnected: computed(() => wsInstance.value?.isConnected || false),
  }
}

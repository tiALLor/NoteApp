import { ref, onMounted, computed, watch } from 'vue'
import { useUserAuthStore } from '../stores/userAuthStore'
import { NoteWebSocketService } from '../services/noteWebSocketService'

const wsInstance = ref<NoteWebSocketService | null>(null)

export function useWebSocketService() {
  const userAuthStore = useUserAuthStore()

  // --- 1. Singleton Initialization ---
  if (!wsInstance.value) {
    // Pass the function to get the token dynamically
    wsInstance.value = new NoteWebSocketService(() => userAuthStore.accessToken)
  }

  // --- 2. Connection Logic Helper ---
  const attemptConnect = () => {
    // Log for debugging
    // console.log(
    //   'WS Connect Check: Auth=',
    //   authStore.isAuthenticated,
    //   'Connected=',
    //   wsInstance.value?.getIsConnected()
    // )

    if (
      userAuthStore.isAuthenticated &&
      wsInstance.value &&
      !wsInstance.value.getIsConnected() &&
      wsInstance.value.ws?.readyState !== WebSocket.OPEN
    ) {
      try {
        wsInstance.value.connect()
      } catch (e) {
        console.error('Connection blocked by initial setup failure:', e)
      }
    }
  }

  // --- 3. Lifecycle Management ---

  // Attempt connection when component mounts
  onMounted(attemptConnect)

  // Watch the authentication status to connect if the token is fetched later
  watch(
    () => userAuthStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        attemptConnect()
      }
    },
    // Runs once immediately on setup
    { immediate: true }
  )

  return {
    ws: wsInstance,
    isConnected: computed(() => wsInstance.value?.getIsConnected()),
  }
}

import { apiWsOrigin } from '../config'
import { ref, type Ref } from 'vue'
import type { WsMessage } from '@server/shared/types'

type MessageHandler = (data: any, connectionId?: string) => void

export class NoteWebSocketService {
  ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: number | null = null
  // Store message handlers
  private eventListeners: Map<string, MessageHandler[]> = new Map()

  public isConnected: Ref<boolean> = ref(false)

  constructor(private getAccessToken: () => string | null) {}

  connect() {
    // Prevent connecting if already connected or in connecting state
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      console.log('WebSocket already open or connecting, skipping new connection attempt.')
      // TODO: consider id to emit an event or return a promise that rejects here
      return
    }

    const token = this.getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }

    const wsUrl = `${apiWsOrigin || 'ws://localhost:3000'}?token=${token}`

    try {
      this.ws = new WebSocket(wsUrl)
      this.setupEventHandlers()
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.scheduleReconnect()
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected.value = true
      this.reconnectAttempts = 0
      this.startPing()
      // TODO : Remove or use Emit internal event for connection success
      this.emit('connected_internal')
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code)
      this.isConnected.value = false
      this.stopPing()

      if (
        event.code !== 1000 &&
        event.code !== 1008 &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.scheduleReconnect()
      } else if (event.code === 1008) {
        console.warn('WebSocket closed due to policy violation (e.g., invalid token).')
        // triggers token refresh
        this.emit('auth_error')
        // give time for refresh
        setTimeout(() => {
          this.scheduleReconnect()
        }, this.reconnectDelay)
      } else {
        console.log('Not attempting to reconnect.')
      }
    }

    this.ws.onerror = (error) => {
      //  reconnection logic is in onclose as onerror often precedes onclose
      console.error('WebSocket error:', error)
    }
  }

  // ===========================================
  // handle message
  // ===========================================
  sendMessage(type: WsMessage['type'], data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    } else {
      console.warn('WebSocket not open. Message not sent:', { type, data })
      // TODO: queue messages or throw an error
      throw new Error(`WebSocket not open. Message not sent: { ${type}, ${data} }`)
    }
  }

  private handleMessage(message: WsMessage) {
    console.log('Received message:', message)

    // Emit to specific listeners
    // type 'get_all_boards' is only for outgoing messages and does not contain data
    if ('data' in message) {
      this.emit(message.type, message.data)
    } else {
      this.emit(message.type)
    }
  }

  // ===========================================
  // utilities
  // ===========================================

  // function for handler registration
  on(type: WsMessage['type'] | 'connected_internal' | 'auth_error', handler: MessageHandler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    this.eventListeners.get(type)?.push(handler)
  }

  off(type: WsMessage['type'] | 'connected_internal' | 'auth_error', handler: MessageHandler) {
    const handlers = this.eventListeners.get(type)
    if (handlers) {
      this.eventListeners.set(
        type,
        handlers.filter((h) => h !== handler)
      )
    }
  }
  private emit(
    // TODO:  remove 'connected_internal' if not used
    type: WsMessage['type'] | 'connected_internal' | 'auth_error',
    data?: any,
    connectionId?: string
  ) {
    const handlers = this.eventListeners.get(type)
    if (handlers) {
      handlers.forEach((handler) => handler(data, connectionId))
    }
  }

  private startPing() {
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private scheduleReconnect() {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(`Scheduling WebSocket reconnect in ${delay}ms...`)

    setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  disconnect() {
    this.stopPing()
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    this.isConnected.value = false
  }
}

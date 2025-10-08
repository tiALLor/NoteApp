import * as http from 'http'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest'
import WebSocket from 'ws'
import {
  NoteWebSocketServer,
  type WsMessage,
} from '@server/websocketServer/webSocketServer'
import type { Database } from '@server/database'
import { AuthService } from '@server/services/authService'
import type { NoteInsertable, NoteUpdateable } from '@server/entities/note'
import { createTestDatabase } from '@tests/utils/database'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { insertAll } from '@tests/utils/records'
import { fakeNoteBoard, fakeUserWithHash } from '@server/entities/tests/fakes'
import type { BoardCollaboratorPublic } from '@server/entities/boardCollaborator'

// ===========================================
// TEST SETUP
// ===========================================

describe('NoteWebSocketServer Integration Tests', async () => {
  let server: http.Server
  let wsServer: NoteWebSocketServer
  let db: Database
  try {
    db = await wrapInRollbacks(createTestDatabase())
  } catch {
    console.log('Console Error: Please provide database')
    process.exit(1)
  }
  let serverPort: number
  let serverUrl: string
  // let authService: AuthService

  // Test users and tokens
  let testUser1: { id: number; username: string; token: string }
  let testUser2: { id: number; username: string; token: string }
  let testBoard: {
    id: number
    title: string
    ownerId: number
    createdAt: Date
  }

  beforeAll(async () => {
    // Setup test database
    db = await wrapInRollbacks(createTestDatabase())
    // authService = new AuthService(db)

    // Create HTTP server
    server = http.createServer()
    serverPort = await getAvailablePort()
    serverUrl = `ws://localhost:${serverPort}`

    // Initialize WebSocket server
    wsServer = new NoteWebSocketServer(server, db)

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(serverPort, () => {
        console.log(`Test WebSocket server listening on port ${serverPort}`)
        resolve()
      })
    })

    // Create test users
    testUser1 = await createTestUser(db, 'testuser1@test.com', 'testuser1')
    testUser2 = await createTestUser(db, 'testuser2@test.com', 'testuser2')

    // Create test board
    // testBoard = await createTestBoard(db, testUser1.id, 'Test Board')

    // eslint-disable-next-line prefer-destructuring
    testBoard = (
      await insertAll(
        db,
        'noteBoard',
        fakeNoteBoard({
          ownerId: testUser1.id,
          title: 'TestBoard',
          createdAt: new Date().toDateString(),
        })
      )
    )[0]
  })

  afterAll(async () => {
    // Close all WebSocket connections
    wsServer.wss.clients.forEach((client) => client.close())

    // Close servers
    await new Promise<void>((resolve, reject) => {
      wsServer.wss.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  beforeEach(async () => {
    // Clear any test data between tests
    vi.clearAllMocks()
  })

  // ===========================================
  // CONNECTION TESTS
  // ===========================================

  describe('Connection and Authentication', () => {
    it('should establish WebSocket connection with valid token', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)

      const message = await waitForMessage(ws)
      expect(message.type).toBe('connected')
      if (message.type === 'connected') {
        expect(message.data.user.id).toBe(testUser1.id)
        expect(message.data.user.username).toBe(testUser1.username)
        expect(message.data.connectionId).toBeDefined()
      }

      await ws.close()
    })

    it('should reject connection without token', async () => {
      const ws = new WebSocket(serverUrl)

      const closeEvent = await new Promise<{ code: number; reason: string }>(
        (resolve) => {
          ws.on('close', (code, reason) => {
            resolve({ code, reason: reason.toString() })
          })
        }
      )

      expect(closeEvent.code).toBe(1008)
      expect(closeEvent.reason).toBe('Authentication required')
    })

    it('should reject connection with invalid token', async () => {
      const ws = new WebSocket(`${serverUrl}?token=invalid-token`)

      const closeEvent = await new Promise<{ code: number; reason: string }>(
        (resolve) => {
          ws.on('close', (code, reason) => {
            resolve({ code, reason: reason.toString() })
          })
        }
      )

      expect(closeEvent.code).toBe(1008)
      expect(closeEvent.reason).toBe('Invalid token')
    })

    it('should handle multiple concurrent connections', async () => {
      const ws1 = await connectWebSocket(serverUrl, testUser1.token)
      const ws2 = await connectWebSocket(serverUrl, testUser2.token)

      ws1.send(JSON.stringify({ type: 'ping' }))
      ws2.send(JSON.stringify({ type: 'ping' }))

      const [message1, message2] = await Promise.all([
        waitForMessage(ws1),
        waitForMessage(ws2),
      ])

      expect(['connected', 'pong']).toContain(message1.type)
      expect(['connected', 'pong']).toContain(message2.type)
      if (message1.type === 'connected')
        expect(message1.data!.user.id).toBe(testUser1.id)
      if (message2.type === 'connected')
        expect(message2.data!.user.id).toBe(testUser2.id)

      ws1.close()
      ws2.close()
    })
  })

  // ===========================================
  // PING/PONG TESTS
  // ===========================================

  describe('Ping/Pong Heartbeat', () => {
    it('should respond to ping with pong', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws) // Wait for connected message

      ws.send(JSON.stringify({ type: 'ping' }))

      const pongMessage = await waitForMessage(ws)
      expect(pongMessage.type).toBe('pong')

      ws.close()
    })

    it('should handle multiple pings', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      // Send 3 pings
      for (let i = 0; i < 3; i += 1) {
        ws.send(JSON.stringify({ type: 'ping' }))
        // eslint-disable-next-line no-await-in-loop
        const pong = await waitForMessage(ws)
        expect(pong.type).toBe('pong')
      }

      ws.close()
    })
  })

  // ===========================================
  // BOARD OPERATIONS TESTS
  // ===========================================

  describe('Board Operations', () => {
    it('should get all boards for user', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws) // connected

      ws.send(JSON.stringify({ type: 'get_all_boards' }))

      const response = await waitForMessage(ws)
      expect(response.type).toBe('receive_all_boards')
      if (response.type === 'receive_all_boards') {
        expect(Array.isArray(response.data)).toBe(true)
        expect(response.data.length).toBeGreaterThanOrEqual(1)

        const board = response.data.find((b: any) => b.id === testBoard.id)
        expect(board).toBeDefined()
        expect(board?.title).toBe(testBoard.title)
      }
      ws.close()
    })

    it('should create new note board', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      const newBoard = {
        title: 'Integration Test Board',
        ownerId: testUser1.id,
      }

      ws.send(
        JSON.stringify({
          type: 'new_note_board',
          data: newBoard,
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('new_note_board')
      if (
        response.type === 'new_note_board' &&
        response.data &&
        'id' in response.data
      ) {
        expect(response.data.title).toBe(newBoard.title)
        expect(response.data.ownerId).toBe(newBoard.ownerId)
        expect(response.data.id).toBeDefined()
      }

      ws.close()
    })

    it('should update note board title', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      const updateData = {
        id: testBoard.id,
        title: 'Updated Board Title',
      }

      ws.send(
        JSON.stringify({
          type: 'update_note_board',
          data: updateData,
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('updated_note_board')
      if (response.type === 'updated_note_board')
        expect(response.data.title).toBe(updateData.title)

      ws.close()
    })

    it('should delete note board', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      // Create a board to delete
      const [tempBoard] = await insertAll(
        db,
        'noteBoard',
        fakeNoteBoard({
          ownerId: testUser1.id,
          title: 'Temp Board',
          createdAt: new Date().toISOString(),
        })
      )

      ws.send(
        JSON.stringify({
          type: 'delete_note_board',
          data: { boardId: tempBoard.id },
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('delete_note_board')
      if (
        response.type === 'delete_note_board' &&
        response.data &&
        'id' in response.data
      )
        expect(response.data.id).toBe(tempBoard.id)

      ws.close()
    })
  })
  // ===========================================
  // NOTE OPERATIONS TESTS
  // ===========================================

  describe('Note Operations', () => {
    it('should create new note', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      const newNote: NoteInsertable = {
        boardId: testBoard.id,
        content: 'Test note content',
      }

      ws.send(
        JSON.stringify({
          type: 'new_note',
          data: newNote,
        })
      )

      const response = await waitForMessage(ws)
      console.log(testUser1.id)
      console.log(response)
      expect(response.type).toBe('new_note')
      if (
        response.type === 'new_note' &&
        response.data &&
        'id' in response.data
      ) {
        expect(response.data.content).toBe(newNote.content)
        expect(response.data.boardId).toBe(newNote.boardId)
        expect(response.data.id).toBeDefined()
      }

      ws.close()
    })

    it('should update note content', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      // Create a note first
      const note = await createTestNote(db, testBoard.id, 'Original content')

      const updateData: NoteUpdateable & { boardId: number } = {
        id: note.id,
        content: 'Updated content',
        boardId: testBoard.id,
      }

      ws.send(
        JSON.stringify({
          type: 'update_note',
          data: updateData,
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('updated_note')
      if (response.type === 'updated_note')
        expect(response.data.content).toBe(updateData.content)

      ws.close()
    })

    it('should update note isDone status', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      const note = await createTestNote(db, testBoard.id, 'Test note')

      const updateData = {
        id: note.id,
        isDone: true,
        boardId: testBoard.id,
      }

      ws.send(
        JSON.stringify({
          type: 'update_note',
          data: updateData,
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('updated_note')
      if (response.type === 'updated_note')
        expect(response.data.isDone).toBe(true)

      ws.close()
    })

    it('should delete note', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      const note = await createTestNote(db, testBoard.id, 'Note to delete')

      ws.send(
        JSON.stringify({
          type: 'delete_note',
          data: { noteId: note.id, boardId: testBoard.id },
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('delete_note')
      if (
        response.type === 'delete_note' &&
        response.data &&
        'id' in response.data
      )
        expect(response.data.id).toBe(note.id)

      ws.close()
    })
  })

  // ===========================================
  // COLLABORATION TESTS
  // ===========================================

  describe('Collaboration Features', () => {
    it('should broadcast note updates to all collaborators', async () => {
      // Add user2 as collaborator
      await addCollaboratorToBoard(db, testBoard.id, testUser2.id)

      const ws1 = await connectWebSocket(serverUrl, testUser1.token)
      const ws2 = await connectWebSocket(serverUrl, testUser2.token)

      ws1.send(JSON.stringify({ type: 'ping' }))
      ws2.send(JSON.stringify({ type: 'ping' }))

      const [message1, message2] = await Promise.all([
        waitForMessage(ws1),
        waitForMessage(ws2),
      ])

      expect(['connected', 'pong']).toContain(message1.type)
      expect(['connected', 'pong']).toContain(message2.type)

      const note = await createTestNote(db, testBoard.id, 'Collaborative note')

      // User 1 updates the note
      const updateData = {
        id: note.id,
        content: 'Updated by user1',
        boardId: testBoard.id,
      }

      ws1.send(
        JSON.stringify({
          type: 'update_note',
          data: updateData,
        })
      )

      // Both users should receive the update
      const [response1, response2] = await Promise.all([
        waitForMessage(ws1),
        waitForMessage(ws2),
      ])

      expect(response1.type).toBe('updated_note')
      expect(response2.type).toBe('updated_note')
      if (response1.type === 'updated_note')
        expect(response1.data.content).toBe(updateData.content)
      if (response2.type === 'updated_note')
        expect(response2.data.content).toBe(updateData.content)

      ws1.close()
      ws2.close()
    })

    it('should add collaborator to board', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.send(
        JSON.stringify({
          type: 'add_collaborator',
          data: {
            boardId: testBoard.id,
            userId: testUser2.id,
          },
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('updated_collaborator')
      if (response.type === 'updated_collaborator') {
        expect(response.data.collaborators).toBeDefined()

        const collaborator = response.data.collaborators.find(
          (c: any) => c.userId === testUser2.id
        )
        expect(collaborator).toBeDefined()
      }

      ws.close()
    })

    it('should remove collaborator from board', async () => {
      // First add collaborator
      await addCollaboratorToBoard(db, testBoard.id, testUser2.id)

      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.send(
        JSON.stringify({
          type: 'remove_collaborator',
          data: {
            boardId: testBoard.id,
            userId: testUser2.id,
          },
        })
      )

      const response = await waitForMessage(ws)
      expect(response.type).toBe('updated_collaborator')
      if (response.type === 'updated_collaborator') {
        const collaborator = response.data.collaborators?.find(
          (c: any) => c.userId === testUser2.id
        )
        expect(collaborator).toBeUndefined()
      }

      ws.close()
    })

    it('should get all users for collaboration', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.send(JSON.stringify({ type: 'get_all_users' }))

      const response = await waitForMessage(ws)
      expect(response.type).toBe('get_all_users')
      if (response.type === 'get_all_users') {
        expect(Array.isArray(response.data)).toBe(true)
        expect(response.data.length).toBeGreaterThanOrEqual(2)
      }

      ws.close()
    })
  })

  // ===========================================
  // SEMANTIC SEARCH TESTS
  // ===========================================
  describe('Semantic Search with embedding service', () => {
    it('should perform semantic search', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      // Create notes with searchable content
      await createTestNote(db, testBoard.id, 'JavaScript programming tutorial')
      await createTestNote(db, testBoard.id, 'Python data science guide')

      ws.send(
        JSON.stringify({
          type: 'semantic_search',
          data: {
            query: 'programming',
            limit: 10,
          },
        })
      )

      const response = await waitForMessage(ws, 5000)

      expect(response.type).toBe('semantic_search_result')
      if (response.type === 'semantic_search_result')
        expect(Array.isArray(response.data)).toBe(true)

      ws.close()
    })
  })

  // ===========================================
  // ERROR HANDLING TESTS
  // ===========================================

  describe('Error Handling', () => {
    it('should handle invalid message format', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.send('invalid json{')

      const response = await waitForMessage(ws)
      expect(response.type).toBe('error')
      if (response.type === 'error')
        expect(response.data.message).toBe('Invalid message format')

      ws.close()
    })

    it('should handle unknown message type', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.send(JSON.stringify({ type: 'unknown_type', data: {} }))

      // Should not crash, might not send error response
      await new Promise((resolve) => {
        setTimeout(resolve, 500)
      })

      expect(ws.readyState).toBe(WebSocket.OPEN)

      ws.close()
    })

    it('should handle connection disconnect gracefully', async () => {
      const ws = await connectWebSocket(serverUrl, testUser1.token)
      await waitForMessage(ws)

      ws.close()

      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })

      // Connection should be removed from server
      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })
  })
})

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function connectWebSocket(
  url: string,
  token: string
): Promise<WebSocket> {
  const ws = new WebSocket(`${url}?token=${token}`)

  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
    setTimeout(() => reject(new Error('Connection timeout')), 5000)
  })
}

async function waitForMessage(
  ws: WebSocket,
  timeout = 5000
): Promise<WsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.log('Message timeout')
      reject(new Error('Message timeout'))
    }, timeout)

    ws.once('message', (data) => {
      clearTimeout(timer)
      try {
        const message = JSON.parse(data.toString())
        resolve(message)
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(0, () => {
      const { port } = server.address() as any
      server.close(() => resolve(port))
    })
  })
}

async function createTestUser(
  db: Database,
  email: string,
  userName: string
): Promise<{ id: number; username: string; token: string }> {
  const authService = new AuthService(db)
  const PASSWORD_CORRECT = 'Password.098'

  const HASH_PASSWORD_CORRECT =
    await authService.getPasswordHash(PASSWORD_CORRECT)

  const [user] = await insertAll(db, 'user', [
    fakeUserWithHash({ passwordHash: HASH_PASSWORD_CORRECT, email, userName }),
  ])
  // @ ts-ignore
  const result = await authService.login(user.email, PASSWORD_CORRECT)

  return {
    id: result.user.id,
    username: result.user.userName,
    token: result.accessToken,
  }
}

async function createTestNote(
  db: Database,
  boardId: number,
  content: string
): Promise<{ id: number; content: string; boardId: number }> {
  // Implementation depends on your database structure
  const fakeNote = {
    boardId,
    content,
    isDone: false,
  }
  const [note] = await insertAll(db, 'note', fakeNote)
  return { id: note.id, content: note.content, boardId: note.boardId }
}

async function addCollaboratorToBoard(
  db: Database,
  boardId: number,
  userId: number
): Promise<BoardCollaboratorPublic> {
  // Implementation depends on your database structure

  const [collaborator] = await insertAll(db, 'boardCollaborator', {
    boardId,
    userId,
  })
  return collaborator
}

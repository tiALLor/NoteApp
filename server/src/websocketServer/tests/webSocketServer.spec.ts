import crypto from 'crypto'
import url from 'url'
import { EventEmitter } from 'events'
import { vi, describe, test, expect, beforeEach, type Mock } from 'vitest'
import { WebSocket } from 'ws'
import { NoteWebSocketServer } from '@server/websocketServer/webSocketServer'

// 1. Hoist mocks safely
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))

const mockAuthService = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
}))

const mockNoteService = vi.hoisted(() => ({
  getAllUserBoards: vi.fn(),
  getCollaboratorsWithOwner: vi.fn(),
  createNote: vi.fn(),
  updateNoteContent: vi.fn(),
  isDoneNote: vi.fn(),
  deleteNote: vi.fn(),
  createNoteBoard: vi.fn(),
  updateNoteBoardTitle: vi.fn(),
  deleteNoteBoard: vi.fn(),
  addCollaborator: vi.fn(),
  removeCollaborator: vi.fn(),
  semanticSearch: vi.fn(),
  broadCastMessage: vi.fn(),
  getConnectionIdsByUserIds: vi.fn(),
  getConnectionsByNoteBoardId: vi.fn(),
  handleDisconnection: vi.fn(),
}))

const mockUserRepo = vi.hoisted(() => ({
  getById: vi.fn(),
  getUserAll: vi.fn(),
}))

// 2. Module mocks — now factories use the hoisted versions
vi.mock('@server/utils/logger', () => ({ default: mockLogger }))
vi.mock('@server/repositories/userRepository', () => ({
  userRepository: vi.fn(() => mockUserRepo),
}))
vi.mock('@server/services/authService', () => ({
  AuthService: vi.fn(() => mockAuthService),
}))
vi.mock('@server/services/noteService', () => ({
  NoteService: vi.fn(() => mockNoteService),
}))

vi.mock('ws', () => {
  const MockWebSocket = vi.fn(() => ({
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    readyState: 1,
  }))
  // add the OPEN constant
  ;(MockWebSocket as any).OPEN = 1

  const MockWebSocketServer = vi.fn(() => {
    const wss = new EventEmitter() as EventEmitter & {
      clients: Set<any>
      close: (cb?: () => void) => void
    }
    wss.clients = new Set()
    wss.close = vi.fn((cb) => cb?.())
    return wss
  })
  return { WebSocket: MockWebSocket, WebSocketServer: MockWebSocketServer }
})

vi.mock('http', () => ({ Server: vi.fn() }))
vi.mock('crypto', () => {
  const mock = { randomUUID: vi.fn() }
  return { ...mock, default: mock }
})

vi.mock('url', () => {
  const mock = { parse: vi.fn() }
  return { ...mock, default: mock }
})
// --- test helpers and setup ---
const CONNECTION_ID = 'test-connection-id-123-123'
const mockUserId = 101
const mockUser = { id: mockUserId, userName: 'alice' }
const mockDb = {} as any
const mockHttpServer = {} as any

function makeMockWs() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    readyState: 1,
  } as unknown as WebSocket & { on: Mock; send: Mock }
}

function createConnectedServer(ws: WebSocket & { on: Mock; send: Mock }) {
  const server = new NoteWebSocketServer(mockHttpServer, mockDb)
  ;(server as any).connections.set(CONNECTION_ID, {
    ws,
    userId: mockUserId,
    username: mockUser.userName,
  })
  return server
}

describe('NoteWebSocketServer', () => {
  let mockWs: WebSocket & { on: Mock; send: Mock }
  let mockWss: EventEmitter & { clients: Set<any>; close: Mock }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(crypto.randomUUID as Mock).mockReturnValue(CONNECTION_ID)
    ;(url.parse as Mock).mockReturnValue({
      query: { token: 'mock_token' },
    } as any)
    mockWs = makeMockWs()
  })

  describe('setupWebSocket / handleConnection', () => {
    test('closes when no token provided', () => {
      ;(url.parse as Mock).mockReturnValue({ query: {} } as any)

      const server = new NoteWebSocketServer(mockHttpServer, mockDb)
      // grab the mocked wss
      // @ts-ignore
      mockWss = server.wss

      mockWss.emit('connection', mockWs, { url: '/' } as any)

      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Authentication required')
    })

    test('accepts valid token and confirms', async () => {
      mockAuthService.verifyAccessToken.mockResolvedValue({ user: mockUser })
      mockUserRepo.getById.mockResolvedValue(mockUser)

      const server = new NoteWebSocketServer(mockHttpServer, mockDb)
      // @ts-ignore
      mockWss = server.wss

      mockWss.emit('connection', mockWs, { url: '/?token=good' } as any)

      // Let the async handleConnection finish
      await vi.waitFor(() => {
        expect(mockAuthService.verifyAccessToken).toHaveBeenCalled()
        expect(mockUserRepo.getById).toHaveBeenCalled()
        expect(mockWs.send).toHaveBeenCalled()
      })

      // @ts-ignore
      expect(server.connections.has(CONNECTION_ID)).toBe(true)
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'connected',
          data: {
            connectionId: CONNECTION_ID,
            user: { id: mockUserId, username: mockUser.userName },
          },
        })
      )
    })
  })

  describe('handleGetAllBoards', () => {
    test('sends boards on success', async () => {
      const server = createConnectedServer(mockWs)
      const boards = [{ id: 1, title: 'A' }] as any
      mockNoteService.getAllUserBoards.mockResolvedValue(boards)

      // @ts-ignore
      await server.handleGetAllBoards(CONNECTION_ID)

      expect(mockNoteService.getAllUserBoards).toHaveBeenCalledWith(mockUserId)
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'receive_all_boards', data: boards })
      )
    })

    test('logs and sends error on failure', async () => {
      const server = createConnectedServer(mockWs)
      mockNoteService.getAllUserBoards.mockRejectedValue(new Error('DB fail'))

      // @ts-ignore
      await server.handleGetAllBoards(CONNECTION_ID)

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' },
        })
      )
    })
  })

  describe('handleNewNote', () => {
    test('creates note and broadcasts', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { boardId: 5, content: 'hey' } as any
      const note = { id: 7, boardId: 5, content: 'hey' } as any
      const recipients = ['c1', 'c2']

      mockNoteService.createNote.mockResolvedValue(note)
      // @ts-ignore
      server.getConnectionsByNoteBoardId = vi.fn().mockResolvedValue(recipients)
      // @ts-ignore
      server.broadCastMessage = vi.fn()

      // @ts-ignore
      await server.handleNewNote(CONNECTION_ID, payload)

      expect(mockNoteService.createNote).toHaveBeenCalledWith(payload)
      // @ts-ignore
      expect(server.broadCastMessage).toHaveBeenCalledWith(recipients, {
        type: 'new_note',
        data: note,
      })
    })
  })

  describe('handleUpdateNote', () => {
    test('calls updateNoteContent service for content update', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { id: 9, content: 'new', boardId: 5 }
      const updated = { ...payload, isDone: false } as any

      mockNoteService.updateNoteContent.mockResolvedValue(updated)
      // @ts-ignore
      server.broadCastMessage = vi.fn()

      // @ts-ignore
      await server.handleUpdateNote(CONNECTION_ID, payload as any)

      expect(mockNoteService.updateNoteContent).toHaveBeenCalledWith(payload)
      expect(mockNoteService.isDoneNote).not.toHaveBeenCalled()
    })

    test('calls isDoneNote service for status update', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { id: 9, isDone: true, boardId: 5 }
      const updated = { ...payload, content: 'old' } as any

      mockNoteService.isDoneNote.mockResolvedValue(updated)
      // @ts-ignore
      server.broadCastMessage = vi.fn()

      // @ts-ignore
      await server.handleUpdateNote(CONNECTION_ID, payload as any)

      expect(mockNoteService.isDoneNote).toHaveBeenCalledWith(payload)
      expect(mockNoteService.updateNoteContent).not.toHaveBeenCalled()
    })

    test('sends error if payload is incomplete', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { id: 9, boardId: 5 }

      // @ts-ignore
      await server.handleUpdateNote(CONNECTION_ID, payload as any)

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Update failed: missing content or status' },
        })
      )
    })
  })

  describe('handleNewNoteBoard', () => {
    test('creates board and sends confirmation to self', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { title: 'New Board', ownerId: mockUserId } as any
      const board = {
        id: 10,
        title: 'New Board',
        ownerId: mockUserId,
      } as any

      mockNoteService.createNoteBoard.mockResolvedValue(board)

      // @ts-ignore
      await server.handleNewNoteBoard(CONNECTION_ID, payload)

      expect(mockNoteService.createNoteBoard).toHaveBeenCalledWith(payload)
      expect(mockWs.send).toHaveBeenCalled()
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'new_note_board',
          data: board,
        })
      )
    })
  })

  describe('handleAddCollaborator', () => {
    test('adds collaborator and broadcasts updated board', async () => {
      const server = createConnectedServer(mockWs)
      const payload = { boardId: 10, userId: 202 } as any
      const updatedCollaborators = [
        {
          boardId: 10,
          userId: 101,
          collaboratorUserName: 'john',
        },
      ] as any
      const recipients = ['c1', 'c2', 'conn-202']

      mockNoteService.addCollaborator.mockResolvedValue(updatedCollaborators)
      // @ts-ignore
      server.getConnectionsByNoteBoardId = vi.fn().mockResolvedValue(recipients)
      // @ts-ignore
      server.broadCastMessage = vi.fn()

      // @ts-ignore
      await server.handleAddCollaborator(CONNECTION_ID, payload)

      expect(mockNoteService.addCollaborator).toHaveBeenCalledWith(
        mockUserId,
        payload
      )
      // @ts-ignore
      expect(server.broadCastMessage).toHaveBeenCalledWith(recipients, {
        type: 'updated_collaborator',
        data: updatedCollaborators,
      })
    })
  })

  // — handleGetAllUsers —
  describe('handleGetAllUsers', () => {
    let server: NoteWebSocketServer
    const mockUsers = [
      { id: 101, userName: 'alice' },
      { id: 202, userName: 'bob' },
    ] as any[]

    beforeEach(() => {
      // Create a server with a connected client (using the helper function)
      server = createConnectedServer(mockWs)
    })

    test('should fetch all users and send them to the connected client', async () => {
      mockUserRepo.getUserAll.mockResolvedValue(mockUsers)

      // @ts-ignore: Accessing private method for unit test
      await server.handleGetAllUsers(CONNECTION_ID)

      expect(mockUserRepo.getUserAll).toHaveBeenCalled()
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'get_all_users',
          data: mockUsers,
        })
      )
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should send error message to client if fetching fails', async () => {
      const mockError = new Error('User DB fail')
      mockUserRepo.getUserAll.mockRejectedValue(mockError)

      // @ts-ignore: Accessing private method for unit test
      await server.handleGetAllUsers(CONNECTION_ID)

      expect(mockUserRepo.getUserAll).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching all boards:', // Note: The log message is slightly confusing here ("all boards" vs "all users")
        mockError
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' }, // Note: The error message is generic ("note boards" vs "users")
        })
      )
    })

    test('should do nothing if connectionId is invalid', async () => {
      // We intentionally do not use the createConnectedServer helper here,
      // or call the handler with a non-existent ID
      const serverWithoutConnection = new NoteWebSocketServer(
        mockHttpServer,
        mockDb
      )

      // @ts-ignore: Accessing private method for unit test
      await serverWithoutConnection.handleGetAllUsers('non-existent-id')

      expect(mockUserRepo.getUserAll).not.toHaveBeenCalled()
      expect(mockWs.send).not.toHaveBeenCalled()
    })
  })

  describe('handleSemanticSearch', () => {
    let server: NoteWebSocketServer
    const mockSearchData = { query: 'important tasks' } as any
    const mockSearchResults = [
      { id: 1, content: 'task A', similarity: 0.9 },
      { id: 2, content: 'task B', similarity: 0.85 },
    ] as any

    beforeEach(() => {
      // Create a server with a connected client
      server = createConnectedServer(mockWs)
    })

    test('should call noteService.semanticSearch and send results to the client', async () => {
      mockNoteService.semanticSearch.mockResolvedValue(mockSearchResults)

      // @ts-ignore: Accessing private method for unit test
      await server.handleSemanticSearch(CONNECTION_ID, mockSearchData)

      expect(mockNoteService.semanticSearch).toHaveBeenCalledWith(
        mockUserId,
        mockSearchData
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'semantic_search_result',
          data: mockSearchResults,
        })
      )
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should send error message to client if semantic search fails', async () => {
      const mockError = new Error('Embedding service failed')
      mockNoteService.semanticSearch.mockRejectedValue(mockError)

      // @ts-ignore: Accessing private method for unit test
      await server.handleSemanticSearch(CONNECTION_ID, mockSearchData)

      expect(mockNoteService.semanticSearch).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching all boards:',
        mockError
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' },
        })
      )
    })

    test('should do nothing if connectionId is invalid', async () => {
      mockNoteService.semanticSearch.mockClear()

      const serverWithoutConnection = new NoteWebSocketServer(
        mockHttpServer,
        mockDb
      )

      // @ts-ignore: Accessing private method for unit test
      await serverWithoutConnection.handleSemanticSearch(
        'non-existent-id',
        mockSearchData
      )

      expect(mockNoteService.semanticSearch).not.toHaveBeenCalled()
      expect(mockWs.send).not.toHaveBeenCalled()
    })
  })

  describe('handleDeleteNote', () => {
    let server: NoteWebSocketServer
    const mockNoteId = 15
    const mockBoardId = 5
    const mockDeleteData = { noteId: mockNoteId, boardId: mockBoardId }
    const mockDeletedNote = { id: mockNoteId, content: 'To be deleted' } as any
    const mockRecipients = ['conn-2', 'conn-3']

    beforeEach(() => {
      // Create a server with a connected client
      server = createConnectedServer(mockWs)

      // Mock utility methods used inside the handler
      // @ts-ignore
      server.getConnectionsByNoteBoardId = vi
        .fn()
        .mockResolvedValue(mockRecipients)
      // @ts-ignore: Spy on the private utility method
      server.broadCastMessage = vi.fn()
    })

    test('should delete the note and broadcast the change to collaborators', async () => {
      mockNoteService.deleteNote.mockResolvedValue(mockDeletedNote)

      // @ts-ignore: Accessing private method for unit test
      await server.handleDeleteNote(CONNECTION_ID, mockDeleteData)

      expect(mockNoteService.deleteNote).toHaveBeenCalledWith(mockDeleteData)

      // Verify both async calls ran in parallel via Promise.all
      // @ts-ignore
      expect(server.getConnectionsByNoteBoardId).toHaveBeenCalledWith(
        mockBoardId
      )

      // Verify broadcast
      // @ts-ignore
      expect(server.broadCastMessage).toHaveBeenCalledWith(mockRecipients, {
        type: 'delete_note',
        data: mockDeletedNote,
      })
      expect(mockWs.send).not.toHaveBeenCalled() // No error message should be sent
    })

    test('should send error message to client if note deletion fails', async () => {
      const mockError = new Error('Note deletion failed in DB')
      mockNoteService.deleteNote.mockRejectedValue(mockError)

      // @ts-ignore: Accessing private method for unit test
      await server.handleDeleteNote(CONNECTION_ID, mockDeleteData)

      expect(mockNoteService.deleteNote).toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()

      // Verify error message sent back to the client
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to delete the note' },
        })
      )
    })

    test('should do nothing if connectionId is invalid', async () => {
      mockNoteService.deleteNote.mockClear()

      const serverWithoutConnection = new NoteWebSocketServer(
        mockHttpServer,
        mockDb
      )

      // @ts-ignore: Accessing private method for unit test
      await serverWithoutConnection.handleDeleteNote(
        'non-existent-id',
        mockDeleteData
      )

      expect(mockNoteService.deleteNote).not.toHaveBeenCalled()
      expect(mockWs.send).not.toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()
    })
  })

  describe('handleUpdateNoteBoardTitle', () => {
    let server: NoteWebSocketServer
    const mockBoardId = 15
    const mockUpdateData = { id: mockBoardId, title: 'New Board Title' }
    const mockUpdatedBoard = { ...mockUpdateData, ownerId: mockUserId } as any
    const mockRecipients = ['conn-collab-1', 'conn-collab-2']

    beforeEach(() => {
      // Create a server with a connected client
      server = createConnectedServer(mockWs)

      // Mock utility methods used inside the handler
      // @ts-ignore
      server.getConnectionsByNoteBoardId = vi
        .fn()
        .mockResolvedValue(mockRecipients)
      // @ts-ignore: Spy on the private utility method
      server.broadCastMessage = vi.fn()
    })

    test('should call updateNoteBoardTitle and broadcast the change to collaborators', async () => {
      mockNoteService.updateNoteBoardTitle.mockResolvedValue(mockUpdatedBoard)

      // @ts-ignore: Accessing private method for unit test
      await server.handleUpdateNoteBoardTitle(CONNECTION_ID, mockUpdateData)

      expect(mockNoteService.updateNoteBoardTitle).toHaveBeenCalledWith(
        mockUserId,
        mockUpdateData
      )

      // Verify both async calls ran in parallel via Promise.all
      // @ts-ignore
      expect(server.getConnectionsByNoteBoardId).toHaveBeenCalledWith(
        mockBoardId
      )

      // Verify broadcast
      // @ts-ignore
      expect(server.broadCastMessage).toHaveBeenCalledWith(mockRecipients, {
        type: 'updated_note_board',
        data: mockUpdatedBoard,
      })
      expect(mockWs.send).not.toHaveBeenCalled() // No error message should be sent
    })

    test('should send error message to client if the title update fails (e.g., not owner)', async () => {
      const mockError = new Error('User is not the owner of the note board')
      mockNoteService.updateNoteBoardTitle.mockRejectedValue(mockError)

      // @ts-ignore: Accessing private method for unit test
      await server.handleUpdateNoteBoardTitle(CONNECTION_ID, mockUpdateData)

      expect(mockNoteService.updateNoteBoardTitle).toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()

      // Verify error message sent back to the client
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to update note board title' },
        })
      )
    })

    test('should do nothing if connectionId is invalid', async () => {
      mockNoteService.updateNoteBoardTitle.mockClear()

      const serverWithoutConnection = new NoteWebSocketServer(
        mockHttpServer,
        mockDb
      )

      // @ts-ignore: Accessing private method for unit test
      await serverWithoutConnection.handleUpdateNoteBoardTitle(
        'non-existent-id',
        mockUpdateData
      )

      expect(mockNoteService.updateNoteBoardTitle).not.toHaveBeenCalled()
      expect(mockWs.send).not.toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()
    })
  })

  describe('handleRemoveCollaborator', () => {
    let server: NoteWebSocketServer
    const mockBoardId = 20
    const mockCollaboratorId = 303
    const mockRemoveData = {
      boardId: mockBoardId,
      userId: mockCollaboratorId,
    } as any
    const mockupdatedCollaborators = [
      {
        boarId: mockBoardId,
        userId: 'Project X',
        collaboratorUserName: 'John',
      },
    ] as any
    const mockRecipients = ['conn-owner-1', 'conn-collab-2'] // Remaining connections

    beforeEach(() => {
      // Create a server with a connected client (the owner/initiator)
      server = createConnectedServer(mockWs)

      // Mock utility methods used inside the handler
      // @ts-ignore
      server.getConnectionsByNoteBoardId = vi
        .fn()
        .mockResolvedValue(mockRecipients)
      // @ts-ignore: Spy on the private utility method
      server.broadCastMessage = vi.fn()
    })

    test('should call removeCollaborator and broadcast the updated board', async () => {
      mockNoteService.removeCollaborator.mockResolvedValue(
        mockupdatedCollaborators
      )

      // @ts-ignore: Accessing private method for unit test
      await server.handleRemoveCollaborator(CONNECTION_ID, mockRemoveData)

      expect(mockNoteService.removeCollaborator).toHaveBeenCalledWith(
        mockUserId,
        mockRemoveData
      )

      // Verify connections are fetched for the broadcast
      // @ts-ignore
      expect(server.getConnectionsByNoteBoardId).toHaveBeenCalledWith(
        mockBoardId
      )

      // Verify broadcast
      // @ts-ignore
      expect(server.broadCastMessage).toHaveBeenCalledWith(mockRecipients, {
        type: 'updated_collaborator',
        data: mockupdatedCollaborators,
      })
      expect(mockWs.send).not.toHaveBeenCalled() // No error message should be sent
    })

    test('should send error message to client if collaborator removal fails', async () => {
      const mockError = new Error(
        'User is not the owner or collaborator not found'
      )
      mockNoteService.removeCollaborator.mockRejectedValue(mockError)

      // @ts-ignore: Accessing private method for unit test
      await server.handleRemoveCollaborator(CONNECTION_ID, mockRemoveData)

      expect(mockNoteService.removeCollaborator).toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()

      // Verify error message sent back to the client
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to remove collaborator  from note board' },
        })
      )
    })

    test('should send error if service returns falsy value (should not happen based on service code)', async () => {
      mockNoteService.removeCollaborator.mockRejectedValue('error')

      // @ts-ignore: Accessing private method for unit test
      await server.handleRemoveCollaborator(CONNECTION_ID, mockRemoveData)

      expect(mockNoteService.removeCollaborator).toHaveBeenCalled()
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to remove collaborator  from note board' },
        })
      )
    })

    test('should do nothing if connectionId is invalid', async () => {
      mockNoteService.removeCollaborator.mockClear()

      const serverWithoutConnection = new NoteWebSocketServer(
        mockHttpServer,
        mockDb
      )

      // @ts-ignore: Accessing private method for unit test
      await serverWithoutConnection.handleRemoveCollaborator(
        'non-existent-id',
        mockRemoveData
      )

      expect(mockNoteService.removeCollaborator).not.toHaveBeenCalled()
      expect(mockWs.send).not.toHaveBeenCalled()
      // @ts-ignore
      expect(server.broadCastMessage).not.toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    let server: NoteWebSocketServer
    const mockWsOpen = makeMockWs()
    const mockWsClosed = makeMockWs()
    // @ts-ignore
    mockWsClosed.readyState = 3 // WebSocket.CLOSED

    const connIdOwner = CONNECTION_ID // User 101
    const connIdCollab1 = 'conn-404-a' // User 404
    const connIdCollab2 = 'conn-404-b' // User 404 (Multiple connections for one user)
    const connIdOther = 'conn-500' // User 500

    const targetUserIds = [404, 500]

    beforeEach(() => {
      // We need a complex map setup for these tests
      server = new NoteWebSocketServer(mockHttpServer, mockDb)
      // @ts-ignore: Manually populate connections map for testing
      server.connections.set(connIdOwner, {
        ws: mockWsOpen,
        userId: 101,
        username: 'owner',
      })
      // @ts-ignore
      server.connections.set(connIdCollab1, {
        ws: mockWsOpen,
        userId: 404,
        username: 'collab',
      })
      // @ts-ignore
      server.connections.set(connIdCollab2, {
        ws: mockWsClosed,
        userId: 404,
        username: 'collab',
      }) // Closed WS
      // @ts-ignore
      server.connections.set(connIdOther, {
        ws: mockWsOpen,
        userId: 500,
        username: 'other',
      })

      mockWsOpen.send.mockClear() // Clear sends from setup if any
    })

    // --- broadCastMessage ---
    describe('broadCastMessage', () => {
      test('should send message only to open connections in the recipient list', () => {
        const message = { type: 'hello', data: 'world' } as any
        const recipients = [connIdOwner, connIdCollab2, 'conn-non-existent'] // connIdCollab2 is closed

        // @ts-ignore: Accessing private method
        server.broadCastMessage(recipients, message)

        const messageStr = JSON.stringify(message)

        // Should be called only once for connIdOwner (which uses mockWsOpen)
        expect(mockWsOpen.send).toHaveBeenCalledWith(messageStr)
        expect(mockWsOpen.send).toHaveBeenCalledOnce()

        // Should NOT be called for the closed connection (connIdCollab2)
        expect(mockWsClosed.send).not.toHaveBeenCalled()
      })
    })

    // --- getConnectionIdsByUserIds ---
    describe('getConnectionIdsByUserIds', () => {
      test('should return all connection IDs for the given user IDs', () => {
        // @ts-ignore: Accessing private method
        const result = server.getConnectionIdsByUserIds(targetUserIds)

        // Should find connIdCollab1 and connIdCollab2 (user 404) and connIdOther (user 500)
        expect(result).toHaveLength(3)
        expect(result).toEqual(
          expect.arrayContaining([connIdCollab1, connIdCollab2, connIdOther])
        )
        expect(result).not.toContain(connIdOwner) // Should not include user 101
      })

      test('should handle empty input list gracefully', () => {
        // @ts-ignore: Accessing private method
        const result = server.getConnectionIdsByUserIds([])
        expect(result).toHaveLength(0)
      })
    })
  })
  describe('Service Lookup and Lifecycle', () => {
    let server: NoteWebSocketServer
    const boardId = 99
    const mockUserIds = [101, 404]
    const mockCollaborators = [
      { userId: 101, boardId: 99, collaboratorUserName: 'owner' },
      { userId: 404, boardId: 99, collaboratorUserName: 'collab' },
    ] as any[]

    beforeEach(() => {
      server = createConnectedServer(mockWs) // Sets up CONNECTION_ID (user 101)

      // Set up other connections for the lookup test
      // @ts-ignore
      server.connections.set('conn-404-a', {
        ws: makeMockWs(),
        userId: 404,
        username: 'collab',
      })
      // @ts-ignore
      server.connections.set('conn-404-b', {
        ws: makeMockWs(),
        userId: 404,
        username: 'collab',
      })
    })

    // --- getConnectionsByNoteBoardId ---
    describe('getConnectionsByNoteBoardId', () => {
      test('should fetch collaborators and return matching connection IDs', async () => {
        mockNoteService.getCollaboratorsWithOwner.mockResolvedValue(
          mockCollaborators
        )

        // Spy on the helper used internally
        const getConnectionIdsByUserIdsSpy = vi.spyOn(
          server as any,
          'getConnectionIdsByUserIds'
        )

        // @ts-ignore: Accessing private method
        const result = await server.getConnectionsByNoteBoardId(boardId)

        expect(mockNoteService.getCollaboratorsWithOwner).toHaveBeenCalledWith(
          boardId
        )
        expect(getConnectionIdsByUserIdsSpy).toHaveBeenCalledWith(mockUserIds)

        // The result should contain the connection for user 101 and the two connections for user 404
        expect(result).toEqual(
          expect.arrayContaining([CONNECTION_ID, 'conn-404-a', 'conn-404-b'])
        )
        expect(result).toHaveLength(3)
      })

      test('should return empty array if no collaborators are found', async () => {
        mockNoteService.getCollaboratorsWithOwner.mockResolvedValue([])

        // @ts-ignore: Accessing private method
        const result = await server.getConnectionsByNoteBoardId(boardId)

        expect(result).toHaveLength(0)
      })
    })

    // --- handleDisconnection ---
    describe('handleDisconnection', () => {
      test('should remove connection from map and log info', () => {
        // @ts-ignore
        expect(server.connections.has(CONNECTION_ID)).toBe(true)

        // @ts-ignore: Accessing private method
        server.handleDisconnection(CONNECTION_ID)

        // @ts-ignore
        expect(server.connections.has(CONNECTION_ID)).toBe(false)
        expect(mockLogger.info).toHaveBeenCalledWith(
          `User ${mockUser.userName} disconnected`
        )
      })

      test('should handle disconnection of an unknown ID gracefully', () => {
        // @ts-ignore: Accessing private method
        server.handleDisconnection('unknown-id')

        // Should not throw, should not log info (as connection is not found)
        // @ts-ignore
        expect(server.connections.has(CONNECTION_ID)).toBe(true) // Other connections remain
        expect(mockLogger.info).not.toHaveBeenCalled()
      })
    })
  })
})

import * as http from 'http'
import { parse } from 'url'
import { randomUUID } from 'crypto'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { AuthService } from '@server/services/authService'
import { type Database } from '@server/database'
import {
  userRepository,
  type UserRepository,
} from '@server/repositories/userRepository'
import {
  NoteService,
  type NoteBoardWithNoteAndCollaborators,
} from '@server/services/noteService'
import type {
  NotePublic,
  NoteInsertable,
  NoteUpdateable,
  ChangeIsDoneNote,
  NoteSemanticSearch,
} from '@server/entities/note'
import type { BoardCollaboratorInsertable } from '@server/entities/boardCollaborator'
import type {
  NoteBoardInsertable,
  NoteBoardPublic,
  NoteBoardUpdateable,
} from '@server/entities/noteBoard'
import type { UserPublic } from '@server/entities/user'
import logger from '@server/utils/logger'

type WSConnection = {
  ws: WebSocket
  userId: number
  username: string
}

type Message =
  | { type: 'get_all_boards' }
  | { type: 'get_all_users'; data: UserPublic[] }
  | {
      type: 'semantic_search'
      data: NoteSemanticSearch
    }
  | {
      type: 'semantic_search_result'
      data: (NotePublic & { similarity: number })[]
    }
  | { type: 'receive_all_boards'; data: NoteBoardWithNoteAndCollaborators[] }
  | { type: 'new_note'; data: NoteInsertable }
  | {
      type: 'update_note'
      data:
        | (NoteUpdateable & { boardId: number })
        | (ChangeIsDoneNote & { boardId: number })
    }
  | { type: 'updated_note'; data: NotePublic }
  | {
      type: 'delete_note'
      data: { noteId: number; boardId: number } | NotePublic
    }
  | { type: 'get_board_notes'; data: { noteBoarId: number } }
  | { type: 'new_note_board'; data: NoteBoardInsertable }
  | { type: 'update_note_board'; data: NoteBoardUpdateable }
  | { type: 'updated_note_board'; data: NoteBoardPublic }
  | {
      type: 'delete_note_board'
      data: { boardId: number } | NoteBoardPublic
    }
  | {
      type: 'add_collaborator'
      data: BoardCollaboratorInsertable | NoteBoardPublic
    }
  | {
      type: 'remove_collaborator'
      data: BoardCollaboratorInsertable | NoteBoardPublic
    }
  | { type: 'error'; data: { message: string } }

export class NoteWebSocketServer {
  wss: WebSocketServer

  private connections = new Map<string, WSConnection>()

  private authService: AuthService

  private noteService: NoteService

  private db: Database

  private userRepo: UserRepository

  constructor(server: http.Server, db: Database) {
    this.wss = new WebSocketServer({ server })
    this.db = db
    this.userRepo = userRepository(db)
    this.authService = new AuthService(this.db)
    this.noteService = new NoteService(this.db)

    this.setupWebSocket()
  }

  private setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      const url = parse(req.url!, true)
      const token = url.query.token as string

      if (!token) {
        ws.close(1008, 'Authentication required')
        return
      }

      try {
        const data = await this.authService.verifyAccessToken(token)
        const authUser = data.user

        this.handleConnection(ws, authUser.id)
      } catch (error) {
        ws.close(1008, 'Invalid token')
      }
    })

    process.on('SIGTERM', () => {
      this.wss.clients.forEach((client) =>
        client.close(1001, 'Server shutting down')
      )
      this.wss.close(() => logger.info('WebSocket server closed'))
    })
  }

  private async handleConnection(ws: WebSocket, userId: number) {
    const connectionId = randomUUID()

    // Check user in database
    const user = await this.userRepo.getById(userId)

    if (!user) {
      ws.close(1008, 'User not found')
      return
    }

    const connection: WSConnection = {
      ws,
      userId: user.id,
      username: user.userName,
    }
    this.connections.set(connectionId, connection)

    ws.on('message', (data) => {
      this.handleMessage(connectionId, data)
    })

    ws.on('close', () => {
      this.handleDisconnection(connectionId)
    })

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error)
      this.handleDisconnection(connectionId)
    })

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        connectionId,
        user: { id: user.id, username: user.userName },
      })
    )
  }

  private async handleMessage(connectionId: string, data: RawData) {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    try {
      const message = JSON.parse(data.toString())

      switch (message.type) {
        case 'get_all_boards':
          await this.handleGetAllBoards(connectionId)
          break

        case 'get_all_users':
          await this.handleGetAllUsers(connectionId)
          break

        case 'semantic_search':
          await this.handleSemanticSearch(connectionId, message.data)
          break

        case 'new_note':
          await this.handleNewNote(connectionId, message.data)
          break

        case 'update_note':
          await this.handleUpdateNote(connectionId, message.data)
          break

        case 'delete_note':
          await this.handleDeleteNote(connectionId, message.data)
          break

        case 'new_note_board':
          await this.handleNewNoteBoard(connectionId, message.data)
          break

        case 'update_note_board':
          await this.handleUpdateNoteBoardTitle(connectionId, message.data)
          break

        case 'delete_note_board':
          await this.handleDeleteNoteBoard(connectionId, message.data)
          break

        case 'add_collaborator':
          await this.handleAddCollaborator(connectionId, message.data)
          break

        case 'remove_collaborator':
          await this.handleRemoveCollaborator(connectionId, message.data)
          break

        default:
          logger.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error)
      connection?.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
        })
      )
    }
  }

  // ===========================================
  // get all users boards (owner + collaborator) with all notes and collaborators
  // ===========================================
  private async handleGetAllBoards(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)

    const userId = connection?.userId

    if (!connection || !userId) {
      return
    }

    try {
      const responseData = await this.noteService.getAllUserBoards(userId)

      const message: Message = {
        type: 'receive_all_boards',
        data: responseData,
      }

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message))
      }
    } catch (error) {
      logger.error('Error fetching all boards:', error)
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' },
        })
      )
    }
  }

  // ===========================================
  // get all users for collaborators
  // ===========================================
  private async handleGetAllUsers(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const responseData = await this.userRepo.getUserAll()

      const message: Message = {
        type: 'get_all_users',
        data: responseData,
      }

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message))
      }
    } catch (error) {
      logger.error('Error fetching all boards:', error)
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' },
        })
      )
    }
  }

  // ===========================================
  // semantic search
  // ===========================================
  private async handleSemanticSearch(
    connectionId: string,
    data: NoteSemanticSearch
  ): Promise<void> {
    const connection = this.connections.get(connectionId)

    const userId = connection?.userId

    if (!connection || !userId) {
      return
    }

    try {
      const responseData = await this.noteService.semanticSearch(userId, data)

      const message: Message = {
        type: 'semantic_search_result',
        data: responseData,
      }

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message))
      }
    } catch (error) {
      logger.error('Error fetching all boards:', error)
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to download note boards' },
        })
      )
    }
  }

  // ===========================================
  // new note
  // ===========================================
  private async handleNewNote(
    connectionId: string,
    data: NoteInsertable
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const [responseData, recipientsConnIds] = await Promise.all([
        this.noteService.createNote(data),
        this.getConnectionsByNoteBoardId(data.boardId),
      ])

      const message: Message = {
        type: 'updated_note',
        data: responseData,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to create new note' },
        })
      )
    }
  }

  // ===========================================
  // update note
  // ===========================================
  private async handleUpdateNote(
    connectionId: string,
    data:
      | (NoteUpdateable & { boardId: number })
      | (ChangeIsDoneNote & { boardId: number })
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      let updatePromise: Promise<NotePublic>
      if (NoteWebSocketServer.isNoteUpdateableContent(data)) {
        updatePromise = this.noteService.updateNoteContent(data)
      } else if (NoteWebSocketServer.isNoteUpdateableIsDone(data)) {
        updatePromise = this.noteService.isDoneNote(data)
      } else {
        // Handle case where neither content nor isDone is provided
        logger.warn(
          'Note update message received without content or isDone field:',
          data
        )
        connection.ws.send(
          JSON.stringify({
            type: 'error',
            data: { message: 'Update failed: missing content or status' },
          })
        )
        return
      }

      const [responseData, recipientsConnIds] = await Promise.all([
        updatePromise,
        this.getConnectionsByNoteBoardId(data.boardId),
      ])

      const message: Message = {
        type: 'updated_note',
        data: responseData,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to update the note' },
        })
      )
    }
  }

  // ===========================================
  // delete note
  // ===========================================
  private async handleDeleteNote(
    connectionId: string,
    data: { noteId: number; boardId: number }
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const [responseData, recipientsConnIds] = await Promise.all([
        this.noteService.deleteNote(data),
        this.getConnectionsByNoteBoardId(data.boardId),
      ])

      const message: Message = {
        type: 'delete_note',
        data: responseData,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to delete the note' },
        })
      )
    }
  }

  // ===========================================
  // new board
  // ===========================================
  private async handleNewNoteBoard(
    connectionId: string,
    data: NoteBoardInsertable
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const responseData = await this.noteService.createNoteBoard(data)

      const message: Message = {
        type: 'updated_note_board',
        data: responseData,
      }

      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message))
      }
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to create new note board' },
        })
      )
    }
  }

  // ===========================================
  // update note board
  // ===========================================
  private async handleUpdateNoteBoardTitle(
    connectionId: string,
    data: NoteBoardUpdateable
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const [responseData, recipientsConnIds] = await Promise.all([
        this.noteService.updateNoteBoardTitle(userId, data),
        this.getConnectionsByNoteBoardId(data.id),
      ])

      const message: Message = {
        type: 'updated_note_board',
        data: responseData,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to update note board title' },
        })
      )
    }
  }

  // ===========================================
  // delete note boars
  // ===========================================
  private async handleDeleteNoteBoard(
    connectionId: string,
    data: { boardId: number }
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const [responseData, recipientsConnIds] = await Promise.all([
        this.noteService.deleteNoteBoard(userId, data),
        this.getConnectionsByNoteBoardId(data.boardId),
      ])

      const message: Message = {
        type: 'delete_note_board',
        data: responseData,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to delete note board' },
        })
      )
    }
  }

  // ===========================================
  // add collaborator
  // ===========================================
  private async handleAddCollaborator(
    connectionId: string,
    data: BoardCollaboratorInsertable
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const updatedBoard: NoteBoardPublic =
        await this.noteService.addCollaborator(userId, data)
      if (!updatedBoard) {
        throw new Error('Failed to create new collaborator')
      }

      const recipientsConnIds = await this.getConnectionsByNoteBoardId(
        updatedBoard.id
      )

      const message: Message = {
        type: 'add_collaborator',
        data: updatedBoard,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to create note board collaborator' },
        })
      )
    }
  }

  // ===========================================
  // remove collaborator
  // ===========================================
  private async handleRemoveCollaborator(
    connectionId: string,
    data: BoardCollaboratorInsertable
  ): Promise<void> {
    const connection = this.connections.get(connectionId)
    const userId = connection?.userId
    if (!connection || !userId) return

    try {
      const updatedBoard: NoteBoardPublic =
        await this.noteService.removeCollaborator(userId, data)
      if (!updatedBoard) {
        throw new Error('Failed to remove collaborator from note board')
      }

      const recipientsConnIds = await this.getConnectionsByNoteBoardId(
        updatedBoard.id
      )

      const message: Message = {
        type: 'remove_collaborator',
        data: updatedBoard,
      }

      // Broadcast change to other collaborators
      this.broadCastMessage(recipientsConnIds, message)
    } catch (error) {
      connection.ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: 'Failed to remove collaborator  from note board' },
        })
      )
    }
  }

  // ===========================================
  // utility functions
  // ===========================================
  private broadCastMessage(
    recipientsConnIds: string[],
    message: Message
  ): void {
    const messageStr = JSON.stringify(message)

    recipientsConnIds.forEach((id) => {
      const connection = this.connections.get(id)
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(messageStr)
      }
    })
  }

  private getConnectionIdsByUserIds(ids: number[]): string[] {
    const result: string[] = []

    ids.forEach((targetUserId) => {
      const connectionIds = [...this.connections.entries()]
        .filter(([, conn]) => conn.userId === targetUserId)
        .map(([id]) => id)

      result.push(...connectionIds)
    })

    return result
  }

  private async getConnectionsByNoteBoardId(
    boardID: number
  ): Promise<string[]> {
    const collaboratorsWithOwner =
      await this.noteService.getCollaboratorsWithOwner(boardID)

    return this.getConnectionIdsByUserIds(
      collaboratorsWithOwner.map((c) => c.userId)
    )
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    this.connections.delete(connectionId)
    logger.info(`User ${connection.username} disconnected`)
  }

  // ===========================================
  // type guards
  // ===========================================
  private static isNoteUpdateableContent(
    data: any
  ): data is NoteUpdateable & { boardId: number } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'content' in data &&
      'boardId' in data
    )
  }

  private static isNoteUpdateableIsDone(
    data: any
  ): data is NoteUpdateable & { boardId: number } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'isDone' in data &&
      'boardId' in data
    )
  }

  private static isNoteBoardPublic(data: any): data is NoteBoardPublic {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'title' in data &&
      'ownerId' in data
    )
  }
}

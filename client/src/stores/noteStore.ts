import { computed, onMounted, onUnmounted, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  BoardCollaboratorInsertable,
  NoteBoardInsertable,
  NoteBoardPublic,
  NoteBoardUpdateable,
  UserPublic,
} from '@server/shared/types'
import type { NoteBoardWithNoteAndCollaborators } from '@server/services/noteService'
import { useWebSocketService } from '../composables/useNoteWebSocketService'
import { useUserAuthStore } from './userAuthStore'
import type {
  ChangeIsDoneNote,
  NoteInsertable,
  NotePublic,
  NoteUpdateable,
} from '@server/shared/types'

// ===============================================
// note store
// ===============================================

export const useNoteStore = defineStore('noteStore', () => {
  const authStore = useUserAuthStore()
  const allUsers = ref<UserPublic[] | null>(null)
  const noteBoards = ref<NoteBoardWithNoteAndCollaborators[] | null>(null)
  const searchResults = ref<(NotePublic & { similarity: number })[] | null>(null)

  const connectionId = ref<string | null>(null)
  const storeUser = ref<UserPublic | null>(null)
  const error = ref<string | null>(null)

  const noteBoardIds = computed<number[]>(() =>
    noteBoards.value ? noteBoards.value.map((noteBoard) => noteBoard.id) : []
  )

  const { ws, isConnected } = useWebSocketService()

  // ===============================================
  // Getters
  // ===============================================

  const getBoardById = (boardId: number) => noteBoards.value?.find((board) => board.id === boardId)

  // ===============================================
  // WebSocket Listeners
  // ===============================================
  const handleServerConnected = (data: { connectionId: string; user: UserPublic }) => {
    if (authStore.authUser?.id === data.user.id) {
      console.log(`Connection on ws: Returned user id do not match authUser`)
      return
    }

    connectionId.value = data.connectionId
    storeUser.value = data.user
    console.log('Server connected and acknowledged. Requesting data...')

    // requesting note board data for the user
    if (ws.value) {
      ws.value.sendMessage('get_all_boards')
      ws.value.sendMessage('get_all_users')
    }
  }

  const handleReceiveAllBoards = (data: NoteBoardWithNoteAndCollaborators[]) => {
    noteBoards.value = data
  }

  const handleReceiveAllUsers = (data: UserPublic[]) => {
    allUsers.value = data
  }

  const handleSemanticSearchResult = (data: (NotePublic & { similarity: number })[]) => {
    searchResults.value = data
  }

  const handleNewNote = (data: NotePublic) => {
    const board = getBoardById(data.boardId)
    if (board && !board.notes.some((n) => n.id === data.id)) {
      board.notes.push(data) // Push is reactive for adding
    }
  }

  const handleUpdateNote = (data: NotePublic) => {
    const board = getBoardById(data.boardId)
    if (board) {
      const index = board.notes.findIndex((n) => n.id === data.id)
      if (index !== -1) {
        board.notes[index] = data
      }
    }
  }

  const handleDeleteNote = (data: NotePublic) => {
    // Assuming server sends NotePublic, or { id, boardId }
    const board = getBoardById(data.boardId)
    if (board) {
      // Filter is reactive
      board.notes = board.notes.filter((n) => n.id !== data.id)
    }
  }

  const handleNoteBoardUpdate = (data: NoteBoardPublic) => {
    if (!noteBoards.value) return

    const index = noteBoards.value.findIndex((noteBoard) => noteBoard.id === data.id)
    if (index === -1) {
      throw new Error(`BoardId ${data.id} was not found in store`)
    }

    const board = noteBoards.value[index]
    noteBoards.value[index] = {
      ...board,
      title: data.title,
    }
  }

  const handleDeleteNoteBoard = (data: NoteBoardPublic) => {
    if (!noteBoards.value) return

    const index = noteBoards.value.findIndex((noteBoard) => noteBoard.id === data.id)
    if (index !== -1) {
      // Use splice for array reactivity and not delete
      noteBoards.value.splice(index, 1)
    }
  }
  const handleAddCollaborator = (data: NoteBoardWithNoteAndCollaborators) => {
    if (!noteBoards.value) {
      noteBoards.value = [data] // First board added
      return
    }

    const index = noteBoards.value.findIndex((noteBoard) => noteBoard.id === data.id)

    if (index !== -1) {
      // Update existing board (collaborator list changed)
      noteBoards.value[index] = data
    } else {
      // User was added to a new board (add the board to the array)
      noteBoards.value.push(data)
    }
  }

  const handleError = (data: { message: string }) => {
    error.value = data.message
    console.error('WebSocket Error:', data.message)
  }

  const handleAuthError = () => {
    authStore.refreshToken()
  }

  // ===============================================
  // Send messages to Server
  // ===============================================
  const sendSemanticSearch = (query: string) => {
    ws.value?.sendMessage('semantic_search', { query })
  }

  const sendNewNote = (data: NoteInsertable) => {
    ws.value?.sendMessage('new_note', data)
  }

  const sendUpdateNoteContent = (data: NoteUpdateable & { boardId: number }) => {
    ws.value?.sendMessage('update_note', data)
  }

  const sendUpdateNoteIsDone = (data: ChangeIsDoneNote & { boardId: number }) => {
    ws.value?.sendMessage('update_note', data)
  }

  const sendDeleteNote = (data: { noteId: number; boardId: number }) => {
    ws.value?.sendMessage('delete_note', data)
  }

  const sendNewNoteBoars = (data: NoteBoardInsertable) => {
    ws.value?.sendMessage('new_note_board', data)
  }

  const sendUpdateNoteBoard = (data: NoteBoardUpdateable) => {
    const nb = getBoardById(data.id)
    if (nb?.ownerId !== authStore.authUser?.id) {
      throw new Error(`userId ${nb?.ownerId} is not the owner of ${data.id}`)
    }
    ws.value?.sendMessage('update_note_board', data)
  }

  const sendDeleteNoteBoard = (data: { boardId: number }) => {
    ws.value?.sendMessage('delete_note_board', data)
  }

  const sendAddCollaborator = (data: BoardCollaboratorInsertable) => {
    ws.value?.sendMessage('add_collaborator', data)
  }

  const sendRemoveCollaborator = (data: BoardCollaboratorInsertable) => {
    ws.value?.sendMessage('remove_collaborator', data)
  }

  onMounted(() => {
    if (ws.value) {
      //handle
      ws.value.on('connected', handleServerConnected)
      ws.value.on('receive_all_boards', handleReceiveAllBoards)
      ws.value.on('get_all_users', handleReceiveAllUsers)
      ws.value.on('semantic_search_result', handleSemanticSearchResult)
      ws.value.on('new_note', handleNewNote)
      ws.value.on('updated_note', handleUpdateNote)
      ws.value.on('delete_note', handleDeleteNote)
      ws.value.on('update_note_board', handleNoteBoardUpdate)
      ws.value.on('delete_note_board', handleDeleteNoteBoard)
      ws.value.on('updated_collaborator', handleAddCollaborator)
      ws.value.on('error', handleError)
      ws.value.on('auth_error', handleAuthError)
    }
  })

  onUnmounted(() => {
    if (ws.value) {
      ws.value.off('connected', handleServerConnected)
      ws.value.off('receive_all_boards', handleReceiveAllBoards)
      ws.value.off('get_all_users', handleReceiveAllUsers)
      ws.value.off('semantic_search_result', handleSemanticSearchResult)
      ws.value.off('new_note', handleNewNote)
      ws.value.off('updated_note', handleUpdateNote)
      ws.value.off('delete_note', handleDeleteNote)
      ws.value.off('update_note_board', handleNoteBoardUpdate)
      ws.value.off('delete_note_board', handleDeleteNoteBoard)
      ws.value.off('updated_collaborator', handleAddCollaborator)
      ws.value.off('error', handleError)
      ws.value.off('auth_error', handleAuthError)
    }
  })

  return {
    allUsers,
    noteBoards,
    noteBoardIds,
    searchResults,

    isConnected,
    storeUser,
    error,
    // getters
    getBoardById,
    // send message
    sendSemanticSearch,
    sendNewNote,
    sendUpdateNoteContent,
    sendUpdateNoteIsDone,
    sendDeleteNote,
    sendNewNoteBoars,
    sendUpdateNoteBoard,
    sendDeleteNoteBoard,
    sendAddCollaborator,
    sendRemoveCollaborator,
  }
})

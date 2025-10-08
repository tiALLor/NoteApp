import { describe, test, expect, beforeEach, vi } from 'vitest'
import logger from '@server/utils/logger'
import { NoteService } from '../noteService'

// mock logger
vi.mock('@server/utils/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// mock VectorService
const mockVectorService = {
  generateEmbeddings: vi.fn(),
}
vi.mock('../vectorService', () => ({
  VectorService: vi.fn(() => mockVectorService),
  vectorSize: 5,
}))

// repositories mocks
const mockNoteRepo = {
  getNotesByNoteBoardId: vi.fn(),
  createNote: vi.fn(),
  updateNoteContent: vi.fn(),
  updateNoteIsDoneByID: vi.fn(),
  deleteNoteById: vi.fn(),
  updateNoteEmbedding: vi.fn(),
  semanticSearch: vi.fn(),
}
const mockNoteBoardRepo = {
  getNoteBoardsByUserIdWithUser: vi.fn(),
  getNoteBoardByBoardIdWithUser: vi.fn(),
  createNoteBoard: vi.fn(),
  updateNoteBoardTitle: vi.fn(),
  deleteNoteBoardById: vi.fn(),
}
const mockBoardCollaboratorRepo = {
  getCollaboratorByBoardId: vi.fn(),
  addCollaborator: vi.fn(),
  removeCollaborator: vi.fn(),
}

// factory mocks
vi.mock('@server/repositories/noteRepository', () => ({
  noteRepository: vi.fn(() => mockNoteRepo),
}))
vi.mock('@server/repositories/noteBoardRepository', () => ({
  noteBoardRepository: vi.fn(() => mockNoteBoardRepo),
}))
vi.mock('@server/repositories/boardCollaboratorRepository', () => ({
  boardCollaboratorRepository: vi.fn(() => mockBoardCollaboratorRepo),
}))

describe('NoteService', () => {
  let service: NoteService
  const db = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new NoteService(db)
  })

  describe('createNote', () => {
    test('creates note and updates embedding', async () => {
      const fakeNote = { id: 1, content: 'abc' }
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue({
        id: 10,
        ownerId: 2,
        ownerUserName: 'name'

      })
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([{
        boardId: 1,
        userId: 1,
        collaboratorUserName: 'nameName'
      }])
      mockNoteRepo.createNote.mockResolvedValue(fakeNote)
      mockVectorService.generateEmbeddings.mockResolvedValue([
        { embedding: [0.1, 0.2] },
      ])

      const result = await service.createNote(
        { boardId: 10, content: 'abc' },
        1
      )

      expect(result).toEqual(fakeNote)
      expect(mockNoteRepo.createNote).toHaveBeenCalled()
      expect(mockNoteRepo.updateNoteEmbedding).toHaveBeenCalledWith({
        id: 1,
        contentEmbedding: [0.1, 0.2],
      })
    })

    test('logs error if board does not exist', async () => {
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockRejectedValue(
        new Error('no board')
      )

      await expect(
        service.createNote({ boardId: 999, content: 'abc' }, 1)
      ).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('updateNoteContent', () => {
    test('updates note and embedding', async () => {
      const updatedNote = { id: 1, content: 'xyz' }
      mockNoteRepo.updateNoteContent.mockResolvedValue(updatedNote)
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue({
        id: 10,
        ownerId: 2,
        ownerUserName: 'name'

      })
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([{
        boardId: 1,
        userId: 1,
        collaboratorUserName: 'nameName'
      }])
      mockVectorService.generateEmbeddings.mockResolvedValue([
        { embedding: [0.5, 0.6] },
      ])

      const result = await service.updateNoteContent(
        {
          id: 1,
          content: 'xyz',
        },
        2,
        1
      )

      expect(result).toEqual(updatedNote)
      expect(mockNoteRepo.updateNoteEmbedding).toHaveBeenCalledWith({
        id: 1,
        contentEmbedding: [0.5, 0.6],
      })
    })
  })

  describe('isDoneNote', () => {
    test('updates note done status', async () => {
      const updated = { id: 2, isDone: true }
      mockNoteRepo.updateNoteIsDoneByID.mockResolvedValue(updated)
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue({
        id: 10,
        ownerId: 2,
        ownerUserName: 'name'

      })
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([{
        boardId: 1,
        userId: 1,
        collaboratorUserName: 'nameName'
      }])

      const result = await service.isDoneNote(
        {
          id: 2,
          isDone: true,
        },
        1,
        1
      )

      expect(result).toEqual(updated)
      expect(mockNoteRepo.updateNoteIsDoneByID).toHaveBeenCalled()
    })
  })

  describe('deleteNote', () => {
    test('deletes note by id', async () => {
      const deleted = { id: 5, content: 'bye' }
      mockNoteRepo.deleteNoteById.mockResolvedValue(deleted)
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue({
        id: 10,
        ownerId: 2,
        ownerUserName: 'name'

      })
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([{
        boardId: 1,
        userId: 1,
        collaboratorUserName: 'nameName'
      }])

      const result = await service.deleteNote({ noteId: 5, boardId: 10 }, 1)

      expect(result).toEqual(deleted)
    })
  })

  describe('createNoteBoard', () => {
    test('creates board', async () => {
      const board = { id: 1, title: 'B', ownerId: 99 }
      mockNoteBoardRepo.createNoteBoard.mockResolvedValue(board)
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue(board)
      mockNoteRepo.getNotesByNoteBoardId.mockResolvedValue([])
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([])

      const result = await service.createNoteBoard({ title: 'B', ownerId: 99 })

      expect(result).toEqual({
        ...board,
        notes: [],
        collaborators: [],
      })
    })
  })

  describe('updateNoteBoardTitle', () => {
    test('updates title if user is owner', async () => {
      const board = { id: 1, ownerId: 5 }
      const updated = { id: 1, ownerId: 5, title: 'new' }
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue(board)
      mockNoteBoardRepo.updateNoteBoardTitle.mockResolvedValue(updated)

      const result = await service.updateNoteBoardTitle(5, {
        id: 1,
        title: 'new',
      })
      expect(result).toEqual(updated)
    })

    test('throws if user is not owner', async () => {
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockResolvedValue({
        id: 1,
        ownerId: 999,
      })

      await expect(
        service.updateNoteBoardTitle(5, { id: 1, title: 'new' })
      ).rejects.toThrow()
    })
  })

  describe('semanticSearch', () => {
    test('returns search results with embeddings', async () => {
      mockVectorService.generateEmbeddings.mockResolvedValue([
        { embedding: [0.9, 0.8] },
      ])
      const results = [{ id: 1, content: 'xx', similarity: 0.45 }]
      mockNoteRepo.semanticSearch.mockResolvedValue(results)

      const out = await service.semanticSearch(7, { query: 'xx' })

      expect(out).toEqual(results)
      expect(mockNoteRepo.semanticSearch).toHaveBeenCalledWith(
        7,
        [0.9, 0.8],
        expect.any(Object)
      )
    })
  })

  describe('addCollaborator', () => {
    test('adds collaborator successfully', async () => {
      const collab = { id: 1, userId: 10, boardId: 5 }
      mockBoardCollaboratorRepo.addCollaborator.mockResolvedValue(collab)
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockReturnValueOnce({
        ownerId: 1,
      })
      mockNoteRepo.getNotesByNoteBoardId.mockResolvedValue(['notes'])
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue(
        collab
      )

      const result = await service.addCollaborator(1, {
        userId: 10,
        boardId: 5,
      })

      expect(result).toEqual({
        ownerId: 1,
        notes: ['notes'],
        collaborators: collab,
      })
      expect(mockBoardCollaboratorRepo.addCollaborator).toHaveBeenCalledWith({
        userId: 10,
        boardId: 5,
      })
    })
  })

  describe('removeCollaborator', () => {
    test('removes collaborator successfully', async () => {
      const collab = { id: 2, userId: 11, boardId: 6 }
      const updatedCollaborators = [
        {
          boardId: 10,
          userId: 101,
          collaboratorUserName: 'john',
        },
      ] as any
      mockBoardCollaboratorRepo.removeCollaborator.mockResolvedValue(collab)
      mockNoteRepo.getNotesByNoteBoardId.mockResolvedValue(['notes'])
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockReturnValueOnce({
        ownerId: 1,
      })
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue(
        updatedCollaborators
      )

      const result = await service.removeCollaborator(1, {
        userId: 11,
        boardId: 6,
      })

      expect(result).toEqual({
        ownerId: 1,
        notes: ['notes'],
        collaborators: updatedCollaborators,
      })
      expect(mockBoardCollaboratorRepo.removeCollaborator).toHaveBeenCalledWith(
        {
          userId: 11,
          boardId: 6,
        }
      )
    })
  })

  describe('getCollaboratorsWithOwner', () => {
    test('returns collaborators with owner', async () => {
      const collabs = [
        { userId: 10, boardId: 5 },
        { userId: 11, boardId: 5 },
      ]
      const fakeBoardData = {
        ownerId: 1,
        id: 1,
        ownerUserName: 'someName',
        title: 'someTitle',
      }
      const ownerData = {
        boardId: fakeBoardData.id,
        userId: fakeBoardData.ownerId,
        collaboratorUserName: fakeBoardData.ownerUserName,
      }
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue(
        collabs
      )
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockReturnValueOnce(
        fakeBoardData
      )

      const result = await service.getCollaboratorsWithOwner(5)

      expect(result).toEqual([...collabs, ownerData])
      expect(
        mockBoardCollaboratorRepo.getCollaboratorByBoardId
      ).toHaveBeenCalledWith(5)
    })

    test('returns empty array if no collaborators', async () => {
      const fakeBoardData = {
        ownerId: 1,
        id: 1,
        ownerUserName: 'someName',
        title: 'someTitle',
      }
      const ownerData = {
        boardId: fakeBoardData.id,
        userId: fakeBoardData.ownerId,
        collaboratorUserName: fakeBoardData.ownerUserName,
      }
      mockBoardCollaboratorRepo.getCollaboratorByBoardId.mockResolvedValue([])
      mockNoteBoardRepo.getNoteBoardByBoardIdWithUser.mockReturnValueOnce(
        fakeBoardData
      )

      const result = await service.getCollaboratorsWithOwner(99)

      expect(result).toEqual([ownerData])
    })
  })
})

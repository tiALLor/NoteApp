import type { Database } from '@server/database'
import logger from '@server/utils/logger'
import {
  type ChangeIsDoneNote,
  type NoteEmbUpdateable,
  type NoteInsertable,
  type NotePublic,
  type NoteSemanticSearch,
  type NoteUpdateable,
} from '@server/entities/note'
import {
  type BoardCollaboratorInsertable,
  type BoardCollaboratorPublic,
  type BoardCollaboratorPublicWithUser,
} from '@server/entities/boardCollaborator'
import {
  noteBoardRepository,
  type NoteBoardRepository,
} from '@server/repositories/noteBoardRepository'
import {
  noteRepository,
  type NoteRepository,
} from '@server/repositories/noteRepository'
import {
  type NoteBoardInsertable,
  type NoteBoardPublic,
  type NoteBoardPublicWithUser,
  type NoteBoardUpdateable,
} from '@server/entities/noteBoard'
import {
  boardCollaboratorRepository,
  type BoardCollaboratorRepository,
} from '@server/repositories/boardCollaboratorRepository'
import { VectorService } from './vectorService'

export type NoteBoardWithNoteAndCollaborators = NoteBoardPublicWithUser & {
  notes: NotePublic[]
  collaborators: BoardCollaboratorPublicWithUser[]
}

export class NoteService {
  private vectorService: VectorService

  private noteRepo: NoteRepository

  private noteBoardRepo: NoteBoardRepository

  private boardCollaboratorRepo: BoardCollaboratorRepository

  // setup for semantic search
  private limit = 5

  // setup for semantic search
  private threshold = 0.8

  constructor(db: Database) {
    this.vectorService = new VectorService()
    this.noteRepo = noteRepository(db)
    this.noteBoardRepo = noteBoardRepository(db)
    this.boardCollaboratorRepo = boardCollaboratorRepository(db)
  }

  // ===========================================
  // get all users boards (owner + collaborator) with all notes and collaborators
  // ===========================================
  async getAllUserBoards(
    userId: number
  ): Promise<NoteBoardWithNoteAndCollaborators[]> {
    const primaryNoteBoards =
      await this.noteBoardRepo.getNoteBoardsByUserIdWithUser(userId)

    // If no boards, return early
    if (primaryNoteBoards.length === 0) {
      return []
    }

    const noteBoardIds: number[] = primaryNoteBoards.map((nb) => nb.id)
    const collaboratorsMap = new Map<
      number,
      BoardCollaboratorPublicWithUser[]
    >()

    const notesMap = new Map<number, NotePublic[]>()
    await Promise.all([
      (async () => {
        const allNotesGrouped =
          await this.noteRepo.getNotesByNoteBoardIds(noteBoardIds)
        allNotesGrouped.forEach((item) => {
          notesMap.set(item.boardId, item.notes)
        })
        return notesMap
      })(),

      (async () => {
        const allCollaboratorsGrouped =
          await this.boardCollaboratorRepo.getCollaboratorByBoardIds(
            noteBoardIds
          )
        allCollaboratorsGrouped.forEach((item) => {
          collaboratorsMap.set(item.boardId, item.collaborators)
        })
        return collaboratorsMap
      })(),
    ])

    const enrichedBoards: NoteBoardWithNoteAndCollaborators[] =
      primaryNoteBoards.map((noteBoard: NoteBoardPublicWithUser) => ({
        ...noteBoard,
        // Look up notes from the map; default to empty array if none found
        notes: notesMap.get(noteBoard.id) || [],
        // Look up collaborators from the map; default to empty array if none found
        collaborators: collaboratorsMap.get(noteBoard.id) || [],
      }))

    // const enrichedBoards = await Promise.all(
    //   noteBoards.map(async (noteBoard: NoteBoardPublicWithUser) => {
    //     const notes: { boardId: number; notes: NotePublic[] }[] =
    //       await this.noteRepo.getNotesByNoteBoardIds(noteBoardIds)

    //     const collaborators =
    //       await this.boardCollaboratorRepo.getCollaboratorByBoardIds(
    //         noteBoardIds
    //       )

    //     return {
    //       ...noteBoard,
    //       notes: notes.filter((nb: { boardId: number; notes: NotePublic[] }) =>
    //         nb.boardId === noteBoard.id ? nb.notes : []
    //       ),
    //       collaborators: collaborators.filter(
    //         (col: {
    //           boardId: number
    //           collaborators: BoardCollaboratorPublicWithUser[]
    //         }) => (col.boardId === noteBoard.id ? col.collaborators : [])
    //       ),
    //     }
    //   })
    // )

    // const enrichedBoards = await Promise.all(
    //   noteBoards.map(async (noteBoard: NoteBoardPublicWithUser) => {
    //     const notes = await this.noteRepo.getNotesByNoteBoardId(noteBoard.id)
    //     const collaborators =
    //       await this.boardCollaboratorRepo.getCollaboratorByBoardId(
    //         noteBoard.id
    //       )

    //     return {
    //       ...noteBoard,
    //       notes,
    //       collaborators,
    //     }
    //   })
    // )

    return enrichedBoards
  }

  // ===========================================
  // create new note
  // ===========================================
  async createNote(data: NoteInsertable, userId: number): Promise<NotePublic> {
    // let parsedData: NoteInsertable

    // check if board exists
    try {
      await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(data.boardId)
    } catch (error) {
      logger.error(`parse new note or board Id: ${data.boardId}: ${error}`)
      throw error
    }

    // check permission
    if (!(await this.hasPermission(data.boardId, userId))) {
      throw new Error('User is not the owner or collaborator of the note board')
    }

    const newNote = await this.noteRepo.createNote(data)

    try {
      // generate and update note with embedding
      await this.updateNoteEmbedding(newNote.id, newNote.content)
    } catch (error) {
      logger.error(`new note Id: ${newNote.id}: ${error}`)
      throw error
    }

    return newNote
  }

  // ===========================================
  // update note content
  // ===========================================
  async updateNoteContent(
    data: NoteUpdateable,
    boardId: number,
    userId: number
  ): Promise<NotePublic> {
    // check permission
    if (!(await this.hasPermission(boardId, userId))) {
      throw new Error('User is not the owner or collaborator of the note board')
    }

    const updatedNote = await this.noteRepo.updateNoteContent(data)

    try {
      // generate and update note with embedding
      await this.updateNoteEmbedding(updatedNote.id, updatedNote.content)
    } catch (error) {
      logger.error(`new note Id: ${updatedNote.id}: ${error}`)
      throw error
    }

    return updatedNote
  }

  // ===========================================
  // update note isDone
  // ===========================================
  async isDoneNote(
    data: ChangeIsDoneNote,
    boardId: number,
    userId: number
  ): Promise<NotePublic> {
    // check permission
    if (!(await this.hasPermission(boardId, userId))) {
      throw new Error('User is not the owner or collaborator of the note board')
    }

    const updatedNote = await this.noteRepo.updateNoteIsDoneByID(data)

    return updatedNote
  }

  // ===========================================
  // delete note
  // ===========================================
  async deleteNote(
    data: {
      noteId: number
      boardId: number
    },
    userId: number
  ): Promise<NotePublic> {
    // check permission
    if (!(await this.hasPermission(data.boardId, userId))) {
      throw new Error('User is not the owner or collaborator of the note board')
    }

    const deletedNote = await this.noteRepo.deleteNoteById(data.noteId)

    return deletedNote
  }

  // ===========================================
  // create new note board
  // ===========================================
  async createNoteBoard(
    data: NoteBoardInsertable
  ): Promise<NoteBoardWithNoteAndCollaborators> {
    const newNoteBoard = await this.noteBoardRepo.createNoteBoard(data)

    const noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
      newNoteBoard.id
    )

    const notes = await this.noteRepo.getNotesByNoteBoardId(newNoteBoard.id)
    const collaborators =
      await this.boardCollaboratorRepo.getCollaboratorByBoardId(newNoteBoard.id)

    return {
      ...noteBoard,
      notes,
      collaborators,
    }
  }

  // ===========================================
  // update note board title
  // ===========================================
  async updateNoteBoardTitle(
    userId: number,
    data: NoteBoardUpdateable
  ): Promise<NoteBoardPublic> {
    try {
      const noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.id
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
    } catch (error) {
      logger.error(`board: ${data.id}: ${error}`)
      throw error
    }

    const updatedNoteBoard = await this.noteBoardRepo.updateNoteBoardTitle(data)

    return updatedNoteBoard
  }

  // ===========================================
  // delete note board
  // ===========================================
  async deleteNoteBoard(
    userId: number,
    data: { boardId: number }
  ): Promise<NoteBoardPublic> {
    try {
      const noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.boardId
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
    } catch (error) {
      logger.error(`board id: ${data.boardId}: ${error}`)
      throw error
    }

    const deletedNoteBoard = await this.noteBoardRepo.deleteNoteBoardById(
      data.boardId
    )

    return deletedNoteBoard
  }

  // ===========================================
  // add new collaborator from note board
  // ===========================================
  async addCollaborator(
    userId: number,
    data: BoardCollaboratorInsertable
  ): Promise<NoteBoardWithNoteAndCollaborators> {
    let noteBoard: NoteBoardPublicWithUser
    try {
      noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.boardId
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
    } catch (error) {
      logger.error(`board: ${data.boardId}: ${error}`)
      throw error
    }

    let addedCollaborator: BoardCollaboratorPublic
    try {
      addedCollaborator = await this.boardCollaboratorRepo.addCollaborator(data)
    } catch (error) {
      logger.error(`collaborator was not added: ${error}`)
      throw error
    }

    const notes = await this.noteRepo.getNotesByNoteBoardId(
      addedCollaborator.boardId
    )
    const collaborators =
      await this.boardCollaboratorRepo.getCollaboratorByBoardId(
        addedCollaborator.boardId
      )

    return {
      ...noteBoard,
      notes,
      collaborators,
    }
  }

  // ===========================================
  // remove collaborator from note board
  // ===========================================
  async removeCollaborator(
    userId: number,
    data: BoardCollaboratorInsertable
  ): Promise<NoteBoardWithNoteAndCollaborators> {
    let noteBoard: NoteBoardPublicWithUser
    try {
      noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.boardId
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
    } catch (error) {
      logger.error(`board: ${data.boardId}: ${error}`)
      throw error
    }

    let removedCollaborator: BoardCollaboratorPublic
    try {
      removedCollaborator =
        await this.boardCollaboratorRepo.removeCollaborator(data)
    } catch (error) {
      logger.error(`collaborator was not removed: ${error}`)
      throw error
    }

    const notes = await this.noteRepo.getNotesByNoteBoardId(
      removedCollaborator.boardId
    )

    const collaborators =
      await this.boardCollaboratorRepo.getCollaboratorByBoardId(
        removedCollaborator.boardId
      )

    return {
      ...noteBoard,
      notes,
      collaborators,
    }
  }

  // ===========================================
  // get collaborator and owner
  // ===========================================
  async getCollaboratorsWithOwner(
    boarId: number
  ): Promise<BoardCollaboratorPublicWithUser[]> {
    const noteBoard =
      await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(boarId)
    const collaborators =
      await this.boardCollaboratorRepo.getCollaboratorByBoardId(boarId)

    const ownerData: BoardCollaboratorPublicWithUser = {
      boardId: noteBoard.id,
      userId: noteBoard.ownerId,
      collaboratorUserName: noteBoard.ownerUserName,
    }

    return [...collaborators, ownerData]
  }

  // ===========================================
  // semantic search
  // ===========================================
  async semanticSearch(
    userId: number,
    data: NoteSemanticSearch
  ): Promise<(NotePublic & { similarity: number; title: string })[]> {
    let generatedEmb

    try {
      generatedEmb = await this.vectorService.generateEmbeddings([data.query])
    } catch (error) {
      logger.error(`Embedding was not generated: ${error}`)
      throw error
    }

    const searchResults = await this.noteRepo.semanticSearch(
      userId,
      generatedEmb[0].embedding,
      {
        limit: this.limit,
        threshold: this.threshold,
      }
    )

    return searchResults
  }

  // ===========================================
  // PRIVATE updateNoteEmbedding
  // ===========================================
  private async updateNoteEmbedding(noteId: number, content: string) {
    const generatedEmb = await this.vectorService.generateEmbeddings([content])

    const embeddingData: NoteEmbUpdateable = {
      id: noteId,
      contentEmbedding: generatedEmb[0].embedding,
    }

    try {
      await this.noteRepo.updateNoteEmbedding(embeddingData)
    } catch (error) {
      logger.error(`Failed to update embedding for note ${noteId}:`, error)
    }
  }

  // ===========================================
  // PRIVATE hasPermission
  // ===========================================
  private async hasPermission(
    boardId: number,
    userId: number
  ): Promise<boolean> {
    const collaborators = await this.getCollaboratorsWithOwner(boardId)
    const ids = collaborators.map((col) => col.userId)
    console.log(ids)
    console.log(ids.includes(userId))
    return ids.includes(userId)
  }
}

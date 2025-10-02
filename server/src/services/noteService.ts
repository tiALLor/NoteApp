import type { Database } from '@server/database'
import logger from '@server/utils/logger'
import {
  noteInsertableSchema,
  NoteIsDoneUpdateableSchema,
  noteSemanticSearchSchema,
  noteUpdateableSchema,
  type ChangeIsDoneNote,
  type NoteEmbUpdateable,
  type NoteInsertable,
  type NotePublic,
  type NoteSemanticSearch,
  type NoteUpdateable,
} from '@server/entities/note'
import {
  boardCollaboratorInsertableSchema,
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
  noteBoardInsertableSchema,
  noteBoardUpdateableSchema,
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
  private threshold = 0.5

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
    const noteBoards =
      await this.noteBoardRepo.getNoteBoardsByUserIdWithUser(userId)

    const enrichedBoards = await Promise.all(
      noteBoards.map(async (noteBoard: NoteBoardPublicWithUser) => {
        const notes = await this.noteRepo.getNotesByNoteBoardId(noteBoard.id)
        const collaborators =
          await this.boardCollaboratorRepo.getCollaboratorByBoardId(
            noteBoard.id
          )

        return {
          ...noteBoard,
          notes,
          collaborators,
        }
      })
    )

    return enrichedBoards
  }

  // ===========================================
  // create new note
  // ===========================================
  async createNote(data: NoteInsertable): Promise<NotePublic> {
    let parsedData: NoteInsertable

    // check if board exists
    try {
      parsedData = noteInsertableSchema.parse(data)
      await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(parsedData.boardId)
    } catch (error) {
      logger.error(`parse new note or board Id: ${data.boardId}: ${error}`)
      throw error
    }

    const newNote = await this.noteRepo.createNote(parsedData)

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
    data: NoteUpdateable & { boardId: number }
  ): Promise<NotePublic> {
    let parsedData: NoteUpdateable

    try {
      parsedData = noteUpdateableSchema.parse(data)
    } catch (error) {
      logger.error(`parse: ${data.id}: ${error}`)
      throw error
    }

    const updatedNote = await this.noteRepo.updateNoteContent(parsedData)

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
    data: ChangeIsDoneNote & { boardId: number }
  ): Promise<NotePublic> {
    let parsedData: ChangeIsDoneNote

    try {
      parsedData = NoteIsDoneUpdateableSchema.parse(data)
    } catch (error) {
      logger.error(`parse: ${data.id}: ${error}`)
      throw error
    }

    const updatedNote = await this.noteRepo.updateNoteIsDoneByID(parsedData)

    return updatedNote
  }

  // ===========================================
  // delete note
  // ===========================================
  async deleteNote(data: {
    noteId: number
    boardId: number
  }): Promise<NotePublic> {
    const deletedNote = await this.noteRepo.deleteNoteById(data.noteId)

    return deletedNote
  }

  // ===========================================
  // create new note board
  // ===========================================
  async createNoteBoard(
    data: NoteBoardInsertable
  ): Promise<NoteBoardWithNoteAndCollaborators> {
    let parsedData: NoteBoardInsertable

    try {
      parsedData = noteBoardInsertableSchema.parse(data)
    } catch (error) {
      logger.error(`parse new note board: ${error}`)
      throw error
    }

    const newNoteBoard = await this.noteBoardRepo.createNoteBoard(parsedData)

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
    let parsedData: NoteBoardUpdateable

    try {
      const noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.id
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
      parsedData = noteBoardUpdateableSchema.parse(data)
    } catch (error) {
      logger.error(`board: ${data.id}: ${error}`)
      throw error
    }

    const updatedNoteBoard =
      await this.noteBoardRepo.updateNoteBoardTitle(parsedData)

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
    let parsedData: BoardCollaboratorInsertable

    let noteBoard: NoteBoardPublicWithUser
    try {
      noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.boardId
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
      parsedData = boardCollaboratorInsertableSchema.parse(data)
    } catch (error) {
      logger.error(`board: ${data.boardId}: ${error}`)
      throw error
    }

    let addedCollaborator: BoardCollaboratorPublic
    try {
      addedCollaborator =
        await this.boardCollaboratorRepo.addCollaborator(parsedData)
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
    let parsedData: BoardCollaboratorInsertable

    let noteBoard: NoteBoardPublicWithUser
    try {
      noteBoard = await this.noteBoardRepo.getNoteBoardByBoardIdWithUser(
        data.boardId
      )
      if (noteBoard.ownerId !== userId) {
        throw new Error('User is not the owner of the note board')
      }
      parsedData = boardCollaboratorInsertableSchema.parse(data)
    } catch (error) {
      logger.error(`board: ${data.boardId}: ${error}`)
      throw error
    }

    let removedCollaborator: BoardCollaboratorPublic
    try {
      removedCollaborator =
        await this.boardCollaboratorRepo.removeCollaborator(parsedData)
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
  ): Promise<(NotePublic & { similarity: number })[]> {
    let parsedData: NoteSemanticSearch
    let generatedEmb

    try {
      parsedData = noteSemanticSearchSchema.parse(data)
      generatedEmb = await this.vectorService.generateEmbeddings([
        parsedData.query,
      ])
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
}

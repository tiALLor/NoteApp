import type { Database } from '@server/database'
import { cosineDistance, toSql } from 'pgvector/kysely'
import { prefixTable } from '../utils/strings'
import {
  noteKeyPublic,
  type NoteInsertable,
  type NotePublic,
  type NoteEmbUpdateable,
  type NoteUpdateable,
  type ChangeIsDoneNote,
} from '../entities/note'

export function noteRepository(db: Database) {
  return {
    async createNote(note: NoteInsertable): Promise<NotePublic> {
      const result = await db
        .insertInto('note')
        .values(() => {
          if (note.contentEmbedding) {
            return { ...note, contentEmbedding: toSql(note.contentEmbedding) }
          }
          return note
        })
        .returning(noteKeyPublic)
        .executeTakeFirstOrThrow()

      let createdAt: string

      if (result.createdAt instanceof Date) {
        createdAt = result.createdAt.toISOString()
      } else if (typeof result.createdAt === 'string') {
        createdAt = result.createdAt
      } else {
        throw new Error('Unsupported createdAt format')
      }

      return { ...result, createdAt }
    },

    async updateNoteEmbedding(data: NoteEmbUpdateable): Promise<void> {
      const result = await db
        .updateTable('note')
        .set({ contentEmbedding: toSql(data.contentEmbedding) })
        .where('id', '=', data.id)
        .returning(['id'])
        .executeTakeFirst()

      if (!result) throw new Error('Note Not Found')
    },

    async updateNoteContent(data: NoteUpdateable): Promise<NotePublic> {
      const result = await db
        .updateTable('note')
        .set({ content: data.content })
        .where('id', '=', data.id)
        .returning(noteKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('Note Not Found')

      return { ...result, createdAt: result.createdAt.toISOString() }
    },

    async updateNoteIsDoneByID(data: ChangeIsDoneNote): Promise<NotePublic> {
      const result = await db
        .updateTable('note')
        .set({ isDone: data.isDone })
        .where('id', '=', data.id)
        .returning(noteKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('Note Not Found')

      return { ...result, createdAt: result.createdAt.toISOString() }
    },

    async getNotesByNoteBoardId(noteBoarId: number): Promise<NotePublic[]> {
      const result = await db
        .selectFrom('note')
        .where('boardId', '=', noteBoarId)
        .select(noteKeyPublic)
        .orderBy('isDone')
        .execute()

      return result.map((row) => {
        let createdAt: string

        if (row.createdAt instanceof Date) {
          createdAt = row.createdAt.toISOString()
        } else if (typeof row.createdAt === 'string') {
          createdAt = row.createdAt
        } else {
          throw new Error('Unsupported createdAt format')
        }
        return { ...row, createdAt }
      })
    },

    async deleteNoteById(noteId: number): Promise<NotePublic> {
      const result = await db
        .deleteFrom('note')
        .where('id', '=', noteId)
        .returning(noteKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('Note Not Found')

      return { ...result, createdAt: result.createdAt.toISOString() }
    },

    async semanticSearch(
      userId: number,
      embedding: number[],
      options: {
        limit?: number
        threshold?: number
      }
    ): Promise<(NotePublic & { similarity: number })[]> {
      const { limit = 10, threshold = 0.5 } = options
      const similarity = cosineDistance('contentEmbedding', embedding)

      const results = await db
        .selectFrom('note')
        .innerJoin('noteBoard', 'noteBoard.id', 'note.boardId')
        .leftJoin(
          'boardCollaborator',
          'note.boardId',
          'boardCollaborator.boardId'
        )
        .select([
          ...prefixTable('note', noteKeyPublic),
          similarity.as('similarity'),
        ])
        .where(similarity, '<', threshold)
        .where((eb) =>
          eb.or([
            eb('noteBoard.ownerId', '=', userId),
            eb('boardCollaborator.userId', '=', userId),
          ])
        )
        .orderBy(similarity)
        .limit(limit)
        .execute()

      return results.map((row) => {
        let createdAt: string

        if (row.createdAt instanceof Date) {
          createdAt = row.createdAt.toISOString()
        } else if (typeof row.createdAt === 'string') {
          createdAt = row.createdAt
        } else {
          throw new Error('Unsupported createdAt format')
        }
        return { ...row, createdAt, similarity: row.similarity as number }
      })
    },
  }
}

export type NoteRepository = ReturnType<typeof noteRepository>

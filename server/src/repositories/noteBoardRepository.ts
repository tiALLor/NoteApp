import type { Database } from '@server/database'
import { prefixTable } from '@server/utils/strings'
import type { NotePublic } from '@server/entities/note'
import type { BoardCollaboratorPublicWithUser } from '@server/entities/boardCollaborator'
import type { NoteBoardWithNoteAndCollaborators } from '@server/services/noteService'
import {
  noteBoardKeyPublic,
  type NoteBoardInsertable,
  type NoteBoardUpdateable,
  type NoteBoardPublic,
  type NoteBoardPublicWithUser,
} from '../entities/noteBoard'

export function noteBoardRepository(db: Database) {
  return {
    async createNoteBoard(data: NoteBoardInsertable): Promise<NoteBoardPublic> {
      const result = await db
        .insertInto('noteBoard')
        .values(data)
        .returning(noteBoardKeyPublic)
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

    async updateNoteBoardTitle(
      data: NoteBoardUpdateable
    ): Promise<NoteBoardPublic> {
      const result = await db
        .updateTable('noteBoard')
        .set({ title: data.title })
        .where('id', '=', data.id)
        .returning(noteBoardKeyPublic)
        .executeTakeFirst()
      if (!result) throw new Error('NoteBoard Not Found')

      return { ...result, createdAt: result.createdAt.toISOString() }
    },

    async deleteNoteBoardById(noteBoardId: number): Promise<NoteBoardPublic> {
      const result = await db
        .deleteFrom('noteBoard')
        .where('id', '=', noteBoardId)
        .returning(noteBoardKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('NoteBoard Not Found')

      return { ...result, createdAt: result.createdAt.toISOString() }
    },

    async getNoteBoardByBoardIdWithUser(
      boardId: number
    ): Promise<NoteBoardPublicWithUser> {
      const result = await db
        .selectFrom('noteBoard')
        .innerJoin('user', 'noteBoard.ownerId', 'user.id')
        .leftJoin(
          'boardCollaborator',
          'boardCollaborator.boardId',
          'noteBoard.id'
        )
        .where('noteBoard.id', '=', boardId)
        .select([
          ...prefixTable('noteBoard', noteBoardKeyPublic),
          'user.userName as ownerUserName',
          'noteBoard.createdAt',
        ])
        .executeTakeFirst()
      if (!result) throw new Error('NoteBoard Not Found')

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

    async getNoteBoardsByUserIdWithUser(
      userId: number
    ): Promise<NoteBoardPublicWithUser[]> {
      const results = await db
        .selectFrom('noteBoard')
        .innerJoin('user', 'noteBoard.ownerId', 'user.id')
        .leftJoin(
          'boardCollaborator',
          'boardCollaborator.boardId',
          'noteBoard.id'
        )
        .where((eb) =>
          eb.or([
            eb('noteBoard.ownerId', '=', userId),
            eb('boardCollaborator.userId', '=', userId),
          ])
        )
        .select([
          ...prefixTable('noteBoard', noteBoardKeyPublic),
          'user.userName as ownerUserName',
          'noteBoard.createdAt',
        ])
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
        return { ...row, createdAt }
      })
    },

    async getNoteBoardsByUserIdEager(
      userId: number
    ): Promise<NoteBoardWithNoteAndCollaborators[]> {
      const results = await db
        .selectFrom('noteBoard')
        .innerJoin('user as owner', 'noteBoard.ownerId', 'owner.id')
        .leftJoin(
          'boardCollaborator',
          'boardCollaborator.boardId',
          'noteBoard.id'
        )
        .leftJoin(
          'user as collaboratorUser',
          'boardCollaborator.userId',
          'collaboratorUser.id'
        )
        .leftJoin('note', 'note.boardId', 'noteBoard.id') // Join Notes
        .where((eb) =>
          eb.or([
            eb('noteBoard.ownerId', '=', userId),
            eb('boardCollaborator.userId', '=', userId),
          ])
        )
        // Group the entire result set by board ID
        .groupBy('noteBoard.id')
        .select((eb) => [
          // Select base board properties
          ...prefixTable('noteBoard', noteBoardKeyPublic),
          'owner.userName as ownerUserName',
          'noteBoard.createdAt',

          // Aggregate Notes into a JSON array
          eb.fn
            .coalesce(
              eb.fn
                .jsonAgg(
                  eb
                    .selectFrom('note')
                    .select([
                      'note.id',
                      'note.content',
                      'note.isDone',
                      'note.boardId',
                      'note.createdAt',
                    ])
                )
                .distinct(),
              eb.val([])
            )
            .as('notes'),

          // Aggregate Collaborators into a JSON array
          eb.fn
            .coalesce(
              eb.fn
                .jsonAgg(
                  eb
                    .selectFrom('boardCollaborator')
                    .innerJoin(
                      'user as collaboratorUser',
                      'boardCollaborator.userId',
                      'collaboratorUser.id'
                    )
                    .select([
                      'boardCollaborator.boardId',
                      'boardCollaborator.userId',
                      'collaboratorUser.userName as collaboratorUserName',
                    ])
                )
                .distinct(),
              eb.val([])
            )
            .as('collaborators'),
        ])
        .execute()

      // The results are now an array of unique boards, each with notes[] and collaborators[]
      return results.map((row) => {
        // Map types and convert Date/string for createdAt as you did before
        let createdAt: string
        if (row.createdAt instanceof Date) {
          createdAt = row.createdAt.toISOString()
        } else if (typeof row.createdAt === 'string') {
          createdAt = row.createdAt
        } else {
          throw new Error('Unsupported createdAt format')
        }

        // Filter out null/empty results if the board had no notes/collaborators
        const notes = row.notes
          .filter(
            (
              n
            ): n is {
              id: number
              boardId: number
              content: string
              isDone: boolean
              createdAt: Date
            } => n.id !== null
          ) // Type guard for filter
          .map((n) => ({
            // Ensure createdAt is string if it comes as Date
            ...n,
            createdAt:
              n.createdAt instanceof Date
                ? n.createdAt.toISOString()
                : n.createdAt,
          })) as NotePublic[]
        const collaborators = row.collaborators.filter(
          (c) => c.userId !== null
        ) as BoardCollaboratorPublicWithUser[]

        return { ...row, notes, createdAt, collaborators }
      })
    },
  }
}

export type NoteBoardRepository = ReturnType<typeof noteBoardRepository>

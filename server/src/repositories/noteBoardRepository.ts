import type { Database } from '@server/database'
import { prefixTable } from '@server/utils/strings'
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
  }
}

export type NoteBoardRepository = ReturnType<typeof noteBoardRepository>

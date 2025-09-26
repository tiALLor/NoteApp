import type { Database } from '@server/database'
import { prefixTable } from '@server/utils/strings'
import {
  boardCollaboratorKeyPublic,
  type BoardCollaboratorInsertable,
  type BoardCollaboratorPublic,
} from '../entities/boardCollaborator'

export function boardCollaboratorRepository(db: Database) {
  return {
    async addCollaborator(
      data: BoardCollaboratorInsertable
    ): Promise<BoardCollaboratorPublic> {
      return db
        .insertInto('boardCollaborator')
        .values(data)
        .returning(boardCollaboratorKeyPublic)
        .executeTakeFirstOrThrow()
    },

    async removeCollaborator(
      data: BoardCollaboratorInsertable
    ): Promise<BoardCollaboratorPublic> {
      const result = await db
        .deleteFrom('boardCollaborator')
        .where((eb) =>
          eb.and([
            eb('boardId', '=', data.boardId),
            eb('userId', '=', data.userId),
          ])
        )
        .returning(boardCollaboratorKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('Collaborator Not Found')

      return result
    },

    async getCollaboratorByBoardId(boardId: number): Promise<any[]> {
      return db
        .selectFrom('boardCollaborator')
        .innerJoin('user', 'boardCollaborator.userId', 'user.id')
        .where('boardId', '=', boardId)
        .select([
          ...prefixTable('boardCollaborator', boardCollaboratorKeyPublic),
          'user.userName as collaboratorUserName ',
        ])
        .execute()
    },
  }
}

export type NoteRepository = ReturnType<typeof boardCollaboratorRepository>

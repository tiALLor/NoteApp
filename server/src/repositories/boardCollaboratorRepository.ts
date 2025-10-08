import type { Database } from '@server/database'
import { prefixTable } from '@server/utils/strings'
import {
  boardCollaboratorKeyPublic,
  type BoardCollaboratorInsertable,
  type BoardCollaboratorPublic,
  type BoardCollaboratorPublicWithUser,
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

    async getCollaboratorByBoardId(
      boardId: number
    ): Promise<BoardCollaboratorPublicWithUser[]> {
      return db
        .selectFrom('boardCollaborator')
        .innerJoin('user', 'boardCollaborator.userId', 'user.id')
        .where('boardId', '=', boardId)
        .select([
          ...prefixTable('boardCollaborator', boardCollaboratorKeyPublic),
          'user.userName as collaboratorUserName',
        ])
        .execute()
    },

    async getCollaboratorByBoardIds(
      boardIds: number[]
    ): Promise<
      { boardId: number; collaborators: BoardCollaboratorPublicWithUser[] }[]
    > {
      const results: BoardCollaboratorPublicWithUser[] = await db
        .selectFrom('boardCollaborator')
        .innerJoin('user', 'boardCollaborator.userId', 'user.id')
        .where('boardId', 'in', boardIds)
        .select([
          ...prefixTable('boardCollaborator', boardCollaboratorKeyPublic),
          'user.userName as collaboratorUserName',
        ])
        .execute()

      // Group the flat list of collaborators by boardId using a Map (more efficient than repeated filter)
      const groupedCollaboratorsMap = new Map<
        number,
        BoardCollaboratorPublicWithUser[]
      >()

      results.forEach((collaborator) => {
        const collaboratorArray =
          groupedCollaboratorsMap.get(collaborator.boardId) || []
        collaboratorArray.push(collaborator)
        groupedCollaboratorsMap.set(collaborator.boardId, collaboratorArray)
      })

      // Return the final structured array, ensuring every requested boardId is present
      return boardIds.map((boardId) => ({
        boardId,
        // Return the grouped notes, or an empty array if the board had no notes
        collaborators: groupedCollaboratorsMap.get(boardId) || [],
      }))
    },
  }
}

export type BoardCollaboratorRepository = ReturnType<
  typeof boardCollaboratorRepository
>

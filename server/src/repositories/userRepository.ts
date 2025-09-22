import type { Database, User } from '@server/database'
import type { Selectable } from 'kysely'
import {
  userWithHashKeyAll,
  userKeyPublic,
  type UserWithHashInsertable,
  type UserPublic,
} from '../entities/user'

export function userRepository(db: Database) {
  return {
    async create(user: UserWithHashInsertable): Promise<UserPublic> {
      return db
        .insertInto('user')
        .values(user)
        .returning(userKeyPublic)
        .executeTakeFirstOrThrow()
    },

    async getByEmail(email: string): Promise<Selectable<User> | undefined> {
      return db
        .selectFrom('user')
        .where('email', '=', email)
        .select(userWithHashKeyAll)
        .executeTakeFirst()
    },

    async getById(id: number): Promise<Selectable<User> | undefined> {
      return db
        .selectFrom('user')
        .where('id', '=', id)
        .select(userWithHashKeyAll)
        .executeTakeFirst()
    },

    async getByUserName(
      userName: string
    ): Promise<Selectable<User> | undefined> {
      return db
        .selectFrom('user')
        .where('userName', '=', userName)
        .select(userWithHashKeyAll)
        .executeTakeFirst()
    },

    async updatePassword({
      id,
      passwordHash,
    }: {
      id: number
      passwordHash: string
    }): Promise<UserPublic> {
      const result = await db
        .updateTable('user')
        .set({ passwordHash })
        .where('id', '=', id)
        .returning(userKeyPublic)
        .executeTakeFirst()

      if (!result) throw new Error('User Not Found')

      return result
    },

    async deleteUserByEmail(email: string): Promise<UserPublic | undefined> {
      return db
        .deleteFrom('user')
        .where('email', '=', email)
        .returning(userKeyPublic)
        .executeTakeFirst()
    },

    async deleteUserById(id: number): Promise<UserPublic | undefined> {
      return db
        .deleteFrom('user')
        .where('id', '=', id)
        .returning(userKeyPublic)
        .executeTakeFirst()
    },
  }
}

export type UserRepository = ReturnType<typeof userRepository>

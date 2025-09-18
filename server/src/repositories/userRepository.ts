import type { Database, User } from '@server/database'
import type { Selectable } from 'kysely'
import { prefixTable } from '../utils/strings'
import {
  userKeyAll,
  userKeyPublic,
  type UserInsertable,
  type UserPublic,
  type UserWithRoleName,
} from '../entities/user'

export function userRepository(db: Database) {
  return {
    async create(user: UserInsertable): Promise<UserPublic> {
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
        .select(userKeyAll)
        .executeTakeFirst()
    },

    async getByEmailWithRoleName(
      email: string
    ): Promise<UserWithRoleName | undefined> {
      const user = await db
        .selectFrom('user')
        .innerJoin('role', 'user.roleId', 'role.id')
        .where('user.email', '=', email)
        .select((eb) => [
          ...prefixTable('user', userKeyAll),
          eb.ref('role.name').as('roleName'),
        ])
        .executeTakeFirst()
      return user as UserWithRoleName | undefined
    },

    async getById(id: number): Promise<Selectable<User> | undefined> {
      return db
        .selectFrom('user')
        .where('id', '=', id)
        .select(userKeyAll)
        .executeTakeFirst()
    },

    async getByIdWithRoleName(
      id: number
    ): Promise<UserWithRoleName | undefined> {
      const user = await db
        .selectFrom('user')
        .innerJoin('role', 'user.roleId', 'role.id')
        .where('user.id', '=', id)
        .select([...prefixTable('user', userKeyAll), 'role.name as roleName'])
        .executeTakeFirst()

      return user as UserWithRoleName | undefined
    },

    async updatePassword({
      id,
      password,
    }: {
      id: number
      password: string
    }): Promise<UserPublic> {
      const result = await db
        .updateTable('user')
        .set({ password })
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

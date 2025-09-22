import { expect } from 'vitest'
import type { User } from '@server/database/types'
import type { Insertable } from 'kysely'
import { random, randomValidPassword } from '@tests/utils/random'
import type { UserInsertable, UserPublic } from '../user'

const randomId = () =>
  random.integer({
    min: 1,
    max: 1000000,
  })

export const fakeUser = <T extends Partial<UserInsertable>>(
  overrides: T = {} as T
): UserInsertable => ({
  userName: random.name(),
  email: random.email(),
  password: randomValidPassword(),
  ...overrides,
})

export const fakeAuthUser = <T extends Partial<UserPublic>>(
  overrides: T = {} as T
): UserPublic => ({
  id: randomId(),
  userName: random.name(),
  ...overrides,
})

export const fakeUserWithHash = <T extends Partial<Insertable<User>>>(
  overrides: T = {} as T
): Insertable<User> => ({
  userName: random.name(),
  email: random.email(),
  passwordHash: random.string(),
  ...overrides,
})

export const fakeUserWithHashMatcher = <T extends Partial<Insertable<User>>>(
  overrides: T = {} as T
): Insertable<User> => ({
  id: expect.any(Number),
  createdAt: expect.anything(),
  updatedAt: expect.anything(),
  lastLogin: expect.anything(),
  ...fakeUserWithHash(overrides),
})

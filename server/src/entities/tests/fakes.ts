import { expect } from 'vitest'
import type { User, BoardCollaborator } from '@server/database/types'
import type { Insertable } from 'kysely'
import { random, randomValidPassword, randomVector } from '@tests/utils/random'
import type { UserInsertable, UserPublic } from '../user'
import type { NoteInsertable } from '../note'
import type { NoteBoardInsertable } from '../noteBoard'

const randomId = () =>
  random.integer({
    min: 1,
    max: 1000000,
  })

// TODO: change to import from Embeddings service
// cohere embedding service
const vectorSize = 1536

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

export const fakeNote = <T extends Partial<NoteInsertable>>(
  overrides: T = {} as T
): NoteInsertable => ({
  boardId: randomId(),
  content: random.string(),
  contentEmbedding: randomVector(vectorSize),
  ...overrides,
})

export const fakeNoteBoard = <T extends Partial<NoteBoardInsertable>>(
  overrides: T = {} as T
): NoteBoardInsertable => ({
  title: random.string(),
  ownerId: randomId(),
  ...overrides,
})

export const fakeBoardCollaborator = <T extends Partial<BoardCollaborator>>(
  overrides: T = {} as T
): BoardCollaborator => ({
  boardId: randomId(),
  userId: randomId(),
  ...overrides,
})

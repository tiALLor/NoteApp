import type { Database } from '@server/database'

import { userRepository } from './userRepository'
import { noteRepository } from './noteRepository'
import { noteBoardRepository } from './noteBoardRepository'
import { boardCollaboratorRepository } from './boardCollaboratorRepository'

export type RepositoryFactory = <T>(db: Database) => T

// index of all repositories for provideRepos
const repositories = {
  userRepository,
  noteRepository,
  noteBoardRepository,
  boardCollaboratorRepository,
}

export type RepositoriesFactories = typeof repositories
export type Repositories = {
  [K in keyof RepositoriesFactories]: ReturnType<RepositoriesFactories[K]>
}
export type RepositoriesKeys = keyof Repositories

export { repositories }

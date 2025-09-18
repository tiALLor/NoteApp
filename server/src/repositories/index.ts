import type { Database } from '@server/database'

import { roleRepository } from './roleRepository'
import { userRepository } from './userRepository'
import { mealRepository } from './mealRepository'
import { menuRepository } from './menuRepository'
import { orderRepository } from './orderRepository'

export type RepositoryFactory = <T>(db: Database) => T

// index of all repositories for provideRepos
const repositories = {
  roleRepository,
  userRepository,
  mealRepository,
  menuRepository,
  orderRepository,
}

export type RepositoriesFactories = typeof repositories
export type Repositories = {
  [K in keyof RepositoriesFactories]: ReturnType<RepositoriesFactories[K]>
}
export type RepositoriesKeys = keyof Repositories

export { repositories }

import type { User, Meal, Menu, Order } from '@server/database/types'
import type { Insertable } from 'kysely'
import { random } from '@tests/utils/random'
import type { AuthUserWithRoleName } from '../user'

const randomId = () =>
  random.integer({
    min: 1,
    max: 1000000,
  })

export const fakeUser = <T extends Partial<Insertable<User>>>(
  overrides: T = {} as T
): Insertable<User> => ({
  name: random.name(),
  email: random.email(),
  password: 'random.password',
  roleId: 3,
  ...overrides,
})

export const fakeAuthUserWithRoleName = <
  T extends Partial<AuthUserWithRoleName>,
>(
  overrides: T = {} as T
): AuthUserWithRoleName => ({
  id: randomId(),
  name: random.name(),
  roleName: 'user',
  ...overrides,
})

export const fakeMeal = <T extends Partial<Insertable<Meal>>>(
  overrides: T = {} as T
): Insertable<Meal> => ({
  name: random.sentence({ words: 10 }),
  priceEur: random.floating({ min: 0.1, max: 100, fixed: 2 }).toString(),
  type: 'soup',
  ...overrides,
})

export const fakeMenu = <T extends Partial<Insertable<Menu>>>(
  overrides: T = {} as T
): Insertable<Menu> => ({
  date: random.date(),
  mealId: 2,
  ...overrides,
})

export const fakeOrder = <T extends Partial<Insertable<Order>>>(
  overrides: T = {} as T
): Insertable<Order> => ({
  date: random.date(),
  userId: 1,
  soupMealId: 1,
  mainMealId: 2,
  ...overrides,
})

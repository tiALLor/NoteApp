import type { Meal, Menu, Order, User } from '@server/shared/types'
import type { Insertable } from 'kysely'
import { Chance } from 'chance'

// Chance is a lightweight fake data generator.
// Faker.js is another popular library, but it is relatively slow to import.
// Also, if we are running tests in CI server, we want to use the same seed
// every time to make the tests deterministic.
export const random = process.env.CI ? Chance(1) : Chance()

/**
 * Creates a new user with a random email and password. We want a random email
 * as our E2E tests can run against a real database, and we don't want to
 * our tests to fail because of a duplicate email.
 */
export const fakeUser = <T extends Insertable<User>>(overrides: Partial<T> = {} as T) => ({
  email: random.email(),
  password: 'password.123',
  name: random.last(),
  roleName: 'user' as const,
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

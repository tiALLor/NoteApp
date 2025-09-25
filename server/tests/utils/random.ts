import { Chance } from 'chance'
import config from '@server/config'
import { passwordRegex } from '@server/entities/shared'

// Chance is a lightweight fake data generator.
// Faker.js is another popular library, but it is relatively slow to import.
// Also, if we are running tests in CI server, we want to use the same seed
// every time to make the tests deterministic.
export const random = config.isCi ? Chance(1) : Chance()

export const randomValidPassword = (): string => {
  let attempt = 0
  while (attempt < 1000) {
    const password = random.string({ length: 16 })
    if (password.match(passwordRegex)) return password
    attempt += 1
  }
  throw new Error('Failed to generate a valid password after 1000 attempts')
}

export const randomVector = (size: number): number[] => {
  const min = -1
  const max = 1
  return Array.from({ length: size }, () => Math.random() * (max - min) + min)
}

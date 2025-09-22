import { createCallerFactory } from '@server/trpc'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { createTestDatabase } from '@tests/utils/database'
import { insertAll } from '@tests/utils/records'
import { fakeUserWithHash } from '@server/entities/tests/fakes'
import userRouter from '@server/controllers/user'
import { getPasswordHash } from '@server/utils/hash'
import { AuthService } from '@server/middleware/authService'
import type { Database } from '@server/database'

let db: Database
try {
  db = await wrapInRollbacks(createTestDatabase())
} catch {
  console.log('Console Error: Please provide database or run Mock version')
  process.exit(1)
}

const authService = new AuthService(db)

const createCaller = createCallerFactory(userRouter)

const { login } = createCaller({ db, authService })

const PASSWORD_CORRECT = 'Password.098'

const HASH_PASSWORD_CORRECT = await getPasswordHash(PASSWORD_CORRECT)

const [userForLogging] = await insertAll(
  db,
  'user',
  fakeUserWithHash({
    email: 'some@validmail.com',
    passwordHash: HASH_PASSWORD_CORRECT,
  })
)

it('returns a token if the user was logged in ', async () => {
  const { accessToken } = await login({
    email: userForLogging.email,
    password: PASSWORD_CORRECT,
  })

  expect(accessToken).toEqual(expect.any(String))
  expect(accessToken.slice(0, 3)).toEqual('eyJ')
})

it('should throw an error for incorrect password', async () => {
  expect(
    login({
      email: userForLogging.email,
      password: 'password.123!',
    })
  ).rejects.toThrow(/password/i)
})

it('should throw an error for non-existing user', async () => {
  await expect(
    login({
      email: 'nonexisting@user.com',
      password: PASSWORD_CORRECT,
    })
  ).rejects.toThrow() // some error
})

it('throws an error for invalid email', async () => {
  await expect(
    login({
      email: 'not-an-email',
      password: PASSWORD_CORRECT,
    })
  ).rejects.toThrow(/email/i)
})

it('throws an error for a short password', async () => {
  await expect(
    login({
      email: userForLogging.email,
      password: 'short',
    })
  ).rejects.toThrow(/password/i)
})

it('allows logging in with different email case', async () => {
  await expect(
    login({
      email: userForLogging.email.toUpperCase(),
      password: PASSWORD_CORRECT,
    })
  ).resolves.toEqual(expect.anything())
})

it('allows logging in with surrounding white space', async () => {
  await expect(
    login({
      email: ` \t ${userForLogging.email}\t `, // tabs and spaces
      password: PASSWORD_CORRECT,
    })
  ).resolves.toEqual(expect.anything())
})

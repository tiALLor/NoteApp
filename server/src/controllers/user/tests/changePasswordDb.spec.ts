import { createTestDatabase } from '@tests/utils/database'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { createCallerFactory } from '@server/trpc'
import { selectAll, insertAll } from '@tests/utils/records'
import { fakeUserWithHash } from '@server/entities/tests/fakes'
import { authContext } from '@tests/utils/context'
import { userPublicSchema } from '@server/entities/user'
import userRouter from '@server/controllers/user'
import { AuthService } from '@server/services/authService'
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

const PASSWORD_CORRECT = 'Password.098'

const HASH_PASSWORD_CORRECT =
  await authService.getPasswordHash(PASSWORD_CORRECT)

const [userOne] = await insertAll(db, 'user', [
  fakeUserWithHash({ passwordHash: HASH_PASSWORD_CORRECT }),
])

const { changePassword } = createCaller(
  authContext({ db, authService }, userPublicSchema.parse({ ...userOne }))
)

it('should allow to change users password', async () => {
  const data = {
    oldPassword: PASSWORD_CORRECT,
    newPassword: 'newPassword.123',
    confirmNewPassword: 'newPassword.123',
  }
  const [oldUserInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userOne.email)
  )

  const result = await changePassword(data)

  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userOne.email)
  )

  expect(userInDatabase.password).not.toEqual(data.newPassword)

  expect(userInDatabase.passwordHash).not.toEqual(
    oldUserInDatabase.passwordHash
  )

  expect(userInDatabase.passwordHash).toHaveLength(60)

  expect(result).toEqual({
    id: userInDatabase.id,
    userName: userInDatabase.userName,
  })
})

it('should throw a error if old password do not match authUser', async () => {
  const data = {
    oldPassword: 'some_password',
    newPassword: 'newPassword123',
    confirmNewPassword: 'newPassword123',
  }

  await expect(changePassword(data)).rejects.toThrow(/password/i)
})

it('should throw a error if confirmNewPassword do not match', async () => {
  const data = {
    oldPassword: PASSWORD_CORRECT,
    newPassword: 'newPassword123',
    confirmNewPassword: 'newPassword123456',
  }

  await expect(changePassword(data)).rejects.toThrow(/passwords do not match/i)
})

it('should throw a error for a short password', async () => {
  const data = {
    oldPassword: PASSWORD_CORRECT,
    newPassword: '123',
    confirmNewPassword: '123',
  }

  await expect(changePassword(data)).rejects.toThrow(/password/i)
})

import { createTestDatabase } from '@tests/utils/database'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { createCallerFactory } from '@server/trpc'
import { selectAll } from '@tests/utils/records'
import { fakeUser } from '@server/entities/tests/fakes'
import { random } from '@tests/utils/random'
import userRouter from '@server/controllers/user'
import { AuthService } from '@server/middleware/authService'

const db = await wrapInRollbacks(createTestDatabase())
const authService = new AuthService(db)
const createCaller = createCallerFactory(userRouter)

const PASSWORD_CORRECT = 'Password.098'

const { signup } = createCaller({ db, authService })

it('should create a user with role user', async () => {
  const userData = fakeUser({
    password: PASSWORD_CORRECT,
    lastLogin: new Date(),
  })

  const result = await signup(userData)

  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userData.email)
  )

  expect(userInDatabase).toMatchObject({
    id: expect.any(Number),
    userName: userData.userName,
    email: userData.email,
  })

  expect(userInDatabase.passwordHash).toHaveLength(60)

  expect(result).toEqual({
    id: userInDatabase.id,
    userName: userInDatabase.userName,
  })
})

it('should require a valid email', async () => {
  await expect(
    signup(
      fakeUser({
        email: 'user-email-invalid',
      })
    )
  ).rejects.toThrow(/email/i) // throws out some error complaining about "email"
})

it('should require a password with at least 8 characters', async () => {
  await expect(
    signup(
      fakeUser({
        password: 'pas.123',
      })
    )
  ).rejects.toThrow(/password/i)
})

it('stores lowercased email', async () => {
  const userData = fakeUser({
    email: 'some129657@email.com',
  })

  await signup({
    ...userData,
    email: userData.email.toUpperCase(),
  })

  // get user with original lowercase email
  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userData.email)
  )

  expect(userInDatabase.email).toBe(userData.email)
})

it('stores email with trimmed whitespace', async () => {
  const user = fakeUser()
  await signup({
    ...user,
    email: ` \t ${user.email}\t `, // tabs and spaces
  })

  const userInDatabase = await selectAll(db, 'user', (eb) =>
    eb('email', '=', user.email)
  )

  expect(userInDatabase).toHaveLength(1)
})

it('throws an error for duplicate email', async () => {
  const email = random.email()

  // signup once
  await signup(fakeUser({ email }))

  // expect that the second signup will throw an error
  await expect(signup(fakeUser({ email }))).rejects.toThrow(
    /email already exists/i
  )
})

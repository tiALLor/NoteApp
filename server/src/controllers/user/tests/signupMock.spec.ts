import { createCallerFactory } from '@server/trpc'
import { fakeUser } from '@server/entities/tests/fakes'
import userRouter from '@server/controllers/user'
import { AuthService } from '@server/services/authService'
import { TRPCError } from '@trpc/server'

const db = {} as any
const createCaller = createCallerFactory(userRouter)

const PASSWORD_CORRECT = 'Password.098'

const fakeTestUser = fakeUser({ id: 22, password: PASSWORD_CORRECT })
const userInDb = fakeUser({
  id: 11,
  email: 'inDatabase@email.com',
  userName: 'userInDatabase',
})

const fakeAuthService = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signup: (email: string, userName: string, password: string) => {
    if (email.toLowerCase() === userInDb.email.toLowerCase()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User with this email already exists',
      })
    }
    if (userName === userInDb.userName) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Username is already taken',
      })
    }
    return { id: fakeTestUser.id, userName }
  },
} as unknown as AuthService

const { signup } = createCaller({ db, authService: fakeAuthService })

it('should create a user with role user', async () => {
  const result = await signup(fakeTestUser)

  expect(result).toEqual({
    id: fakeTestUser.id,
    userName: fakeTestUser.userName,
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

it('throws an error for duplicate email', async () => {
  // expect that the second signup will throw an error
  await expect(signup(fakeUser({ email: userInDb.email }))).rejects.toThrow(
    /email already exists/i
  )
})

it('throws an error for duplicate userName', async () => {
  // expect that the second signup will throw an error
  await expect(
    signup(fakeUser({ userName: userInDb.userName }))
  ).rejects.toThrow(/Username is already taken/i)
})

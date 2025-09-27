import { createCallerFactory } from '@server/trpc'
import { fakeUser } from '@server/entities/tests/fakes'
import { authContext } from '@tests/utils/context'
import userRouter from '@server/controllers/user'
import { TRPCError } from '@trpc/server'
import { AuthService } from '@server/services/authService'

// we do not need a database for this test
const db = {} as any
const createCaller = createCallerFactory(userRouter)

const PASSWORD_CORRECT = 'Password.098'
const VALID_TOKEN = 'valid-token'

const fakeTestUser = fakeUser({ id: 22, password: PASSWORD_CORRECT })

const fakeAuthService = {
  verifyAccessToken: (token: string) => {
    if (token !== VALID_TOKEN)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid token.',
      })
    return {
      user: {
        id: fakeTestUser.id,
        userName: fakeTestUser.userName,
      },
    }
  },
} as unknown as AuthService

it('should return user with a valid token', async () => {
  // arrange
  const { authMe } = createCaller(
    authContext({
      db,
      authService: fakeAuthService,
      req: {
        header: () => `Bearer ${VALID_TOKEN}`,
      } as any,
    })
  )

  // Act
  const response = await authMe({})

  // Assert
  expect(response).toEqual({
    id: fakeTestUser.id,
    userName: fakeTestUser.userName,
  })
})

it('should throw UNAUTHORIZED for invalid token', async () => {
  const { authMe } = createCaller(
    authContext({
      db,
      authService: fakeAuthService,
      req: {
        header: () => `Bearer wrong-token`,
      } as any,
    })
  )

  await expect(authMe({})).rejects.toThrow('Invalid token')
})

it('should throw UNAUTHORIZED for invalid token', async () => {
  const { authMe } = createCaller(
    authContext({
      db,
      authService: fakeAuthService,
      req: {
        header: () => `Bearer wrong-token`,
      } as any,
    })
  )

  await expect(authMe({})).rejects.toThrow('Invalid token')
})

import { createCallerFactory } from '@server/trpc'
import { fakeUser } from '@server/entities/tests/fakes'
import userRouter from '@server/controllers/user'
import { TRPCError } from '@trpc/server'
import { AuthService } from '@server/services/authService'
import logger from '@server/utils/logger'
import type { Logger } from 'winston'
import { cookieOptions } from '@server/utils/cookies'

// we do not need a database for this test
const db = {} as any
const createCaller = createCallerFactory(userRouter)

const PASSWORD_CORRECT = 'Password.098'
const VALID_TOKEN = 'valid-token'
const VALID_REFRESH_TOKEN = 'valid-refresh-token'

const fakeTestUser = fakeUser({ id: 22, password: PASSWORD_CORRECT })

const fakeAuthService = {
  login: (email: string, password: string) => {
    if (email.toLowerCase() !== fakeTestUser.email.toLowerCase())
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    if (password !== PASSWORD_CORRECT)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    return {
      accessToken: VALID_TOKEN,
      refreshToken: VALID_REFRESH_TOKEN,
      user: { id: fakeTestUser.id, userName: fakeTestUser.userName },
    }
  },
} as unknown as AuthService

const cookieMock = vi.fn()
const clearCookieMock = vi.fn()

const mockRes = {
  cookie: cookieMock,
  clearCookie: clearCookieMock,
}

const { login } = createCaller({
  db,
  authService: fakeAuthService,
  res: mockRes as any,
})

vi.spyOn(logger, 'warn').mockImplementation(() => ({}) as Logger)

afterEach(() => {
  vi.clearAllMocks()
})

it('returns a token if the user was logged in ', async () => {
  const response = await login({
    email: fakeTestUser.email,
    password: PASSWORD_CORRECT,
  })

  expect(response).toEqual({
    accessToken: VALID_TOKEN,
    user: { id: fakeTestUser.id, userName: fakeTestUser.userName },
  })

  // check refresh token in cookie set to httpOnly: true, sameSite: 'strict', path: '/',
  expect(cookieMock).toHaveBeenCalledWith(
    'refreshToken',
    VALID_REFRESH_TOKEN,
    expect.objectContaining(cookieOptions)
  )
})

it('should throw an error for incorrect password', async () => {
  await expect(
    login({
      email: fakeTestUser.email,
      password: 'Password.123!',
    })
  ).rejects.toThrow(/Invalid email or password/i)
  expect(logger.warn).toHaveBeenCalled()
})

it('should throw an error for non-existing user', async () => {
  await expect(
    login({
      email: 'nonexisting@user.com',
      password: PASSWORD_CORRECT,
    })
  ).rejects.toThrow(/Invalid email or password/i)
  expect(logger.warn).toHaveBeenCalled()
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
      email: fakeTestUser.email,
      password: 'short',
    })
  ).rejects.toThrow(/password/i)
})

it('allows logging in with different email case', async () => {
  const response = await login({
    email: fakeTestUser.email.toUpperCase(),
    password: PASSWORD_CORRECT,
  })

  expect(response).toEqual({
    accessToken: VALID_TOKEN,
    user: { id: fakeTestUser.id, userName: fakeTestUser.userName },
  })

  // check refresh token in cookie set to httpOnly: true, sameSite: 'strict', path: '/',
  expect(cookieMock).toHaveBeenCalledWith(
    'refreshToken',
    VALID_REFRESH_TOKEN,
    expect.objectContaining(cookieOptions)
  )
})

it('allows logging in with surrounding white space', async () => {
  const response = await login({
    email: ` \t ${fakeTestUser.email}\t `, // tabs and spaces
    password: PASSWORD_CORRECT,
  })

  expect(response).toEqual({
    accessToken: VALID_TOKEN,
    user: { id: fakeTestUser.id, userName: fakeTestUser.userName },
  })

  // check refresh token in cookie set to httpOnly: true, sameSite: 'strict', path: '/',
  expect(cookieMock).toHaveBeenCalledWith(
    'refreshToken',
    VALID_REFRESH_TOKEN,
    expect.objectContaining(cookieOptions)
  )
})

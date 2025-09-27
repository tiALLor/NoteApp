import { createCallerFactory } from '@server/trpc'
import userRouter from '@server/controllers/user'
import { AuthService } from '@server/services/authService'
import { TRPCError } from '@trpc/server'
import { cookieOptions } from '@server/utils/cookies'

// we do not need a database for this test
const db = {} as any
const createCaller = createCallerFactory(userRouter)

const VALID_TOKEN = 'valid-token'
const VALID_REFRESH_TOKEN = 'valid-refresh-token'

const fakeAuthService = {
  refreshTokens: (refreshToken: string) => {
    if (refreshToken !== VALID_REFRESH_TOKEN)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
        cause: 'Invalid or expired refresh token',
      })
    return {
      refreshToken: 'NEW_REFRESH_TOKEN',
      accessToken: 'NEW_ACCESS_TOKEN',
    }
  },
} as unknown as AuthService

const cookieMock = vi.fn()
const clearCookieMock = vi.fn()

const mockRes = {
  cookie: cookieMock,
  clearCookie: clearCookieMock,
}

it('should return a if a valid refresh token is provided', async () => {
  const { refreshToken } = createCaller({
    db,
    authService: fakeAuthService,
    req: {
      header: () => `Bearer ${VALID_TOKEN}`,
      cookies: { refreshToken: VALID_REFRESH_TOKEN },
    } as any,
    res: mockRes as any,
  })
  const response = await refreshToken({})

  expect(response).toEqual({ accessToken: 'NEW_ACCESS_TOKEN' })

  // check refresh token in cookie set to httpOnly: true, sameSite: 'strict', path: '/',
  expect(cookieMock).toHaveBeenCalledWith(
    'refreshToken',
    'NEW_REFRESH_TOKEN',
    expect.objectContaining(cookieOptions)
  )
})
it('should throw an error if invalid refresh token', async () => {
  const { refreshToken } = createCaller({
    db,
    authService: fakeAuthService,
    req: {
      header: () => `Bearer ${VALID_TOKEN}`,
      cookies: { refreshToken: 'someRefreshToken' },
    } as any,
    res: mockRes as any,
  })

  await expect(refreshToken({})).rejects.toThrow(
    /Invalid or expired refresh token/i
  )
  expect(clearCookieMock).toHaveBeenCalledWith('refreshToken')
})

it('should throw an error if no refresh token', async () => {
  const { refreshToken } = createCaller({
    db,
    authService: fakeAuthService,
    req: {
      header: () => `Bearer ${VALID_TOKEN}`,
    } as any,
    res: mockRes as any,
  })

  await expect(refreshToken({})).rejects.toThrow(/No refresh token provided/i)
})

import { publicProcedure } from '@server/trpc'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'

export default publicProcedure.mutation(async ({ ctx }) => {
  if (!ctx.authService) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Auth service not available',
    })
  }

  // Get refresh token from cookie
  const refreshToken = ctx.req?.cookies?.refreshToken

  if (!refreshToken) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No refresh token provided',
    })
  }

  try {
    // Refresh tokens - access and also refresh
    const tokens = await ctx.authService.refreshTokens(refreshToken)

    // Set new refresh token cookie
    if (ctx.res) {
      ctx.res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      })
    }

    return {
      accessToken: tokens.accessToken,
    }
  } catch (error) {
    // Clear invalid refresh token cookie
    if (ctx.res) {
      ctx.res.clearCookie('refreshToken')
    }
    assertError(error)
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Token refresh failed',
      cause: error,
    })
  }
})

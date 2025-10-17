import { publicProcedure } from '@server/trpc'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'
import logger from '@server/utils/logger'
import { cookieOptions } from '@server/utils/cookies'
import { z } from 'zod'

export default publicProcedure
  .input(z.object({}))
  .mutation(async ({ ctx }): Promise<{ accessToken: string }> => {
    // Get refresh token from cookie
    const refreshToken = await ctx.req?.cookies?.refreshToken

    if (!refreshToken) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token provided',
      })
    }

    try {
      // Refresh the tokens - access and also refresh
      const tokens = await ctx.authService.refreshTokens(refreshToken)

      // Set new refresh token cookie
      if (ctx.res) {
        ctx.res.cookie('refreshToken', tokens.refreshToken, cookieOptions)
      }

      logger.info('Refreshing Tokens')

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

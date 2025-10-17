import { publicProcedure } from '@server/trpc'
import { TRPCError } from '@trpc/server'
import { loginSchema, type UserPublic } from '@server/entities/user'
import logger from '@server/utils/logger'
import { assertError } from '@server/utils/errors'
import { cookieOptions } from '@server/utils/cookies'

export default publicProcedure
  .input(loginSchema)
  .mutation(
    async ({
      input: { email, password },
      ctx,
    }): Promise<{ user: UserPublic; accessToken: string }> => {
      try {
        const { user, accessToken, refreshToken } = await ctx.authService.login(
          email,
          password
        )
        if (ctx.res) {
          ctx.res.cookie('refreshToken', refreshToken, cookieOptions)
        }

        return { user, accessToken }
      } catch (error) {
        logger.warn('Login error:', error)

        assertError(error)
        if (error instanceof TRPCError) {
          throw error
        }

        // Wrap other errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed. Please try again.',
          cause: error,
        })
      }
    }
  )

import config from '@server/config'
import { authenticatedProcedure } from '@server/trpc/authenticatedProcedure'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'
import type { UserPublic } from '@server/shared/types'
import { z } from 'zod'

export default authenticatedProcedure
  .input(z.object({}))
  .mutation(async ({ ctx }) => {
    // we depend on having an Express request object
    if (!ctx.req) {
      const message =
        config.env === 'development' || config.env === 'test'
          ? 'Missing Express request object. If you are running tests, make sure to provide some req object in the procedure context.'
          : 'Missing Express request object.'

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message,
      })
    }
    // we will try to authenticate
    const token = ctx.req.header('Authorization')?.replace('Bearer ', '')

    // if there is no token, we will throw an error
    if (!token) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Unauthenticated. Please log in.',
      })
    }
    if (!ctx.authService) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Auth service not available',
      })
    }

    try {
      const data = await ctx.authService.verifyAccessToken(token)

      const authUser: UserPublic = data.user

      if (!authUser) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token.',
        })
      }

      return authUser
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
        message: 'authMe failed',
        cause: error,
      })
    }
  })

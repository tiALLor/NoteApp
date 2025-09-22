import config from '@server/config'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '..'

export const authenticatedProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.authUser) {
      return next({
        ctx: {
          authUser: ctx.authUser,
        },
      })
    }
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

    // if we do not have an authenticated user, we will try to authenticate
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
    const data = await ctx.authService.verifyAccessToken(token)

    const authUser = data.user

    if (!authUser) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid token.',
      })
    }

    return next({
      ctx: {
        ...ctx,
        authUser,
      },
    })
  }
)

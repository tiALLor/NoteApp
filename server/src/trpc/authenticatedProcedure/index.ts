import config from '@server/config'
import jsonwebtoken from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import { parseTokenPayload } from '@server/trpc/tokenPayload'
import { publicProcedure } from '..'

const { tokenKey } = config.auth

function verify(token: string) {
  return jsonwebtoken.verify(token, tokenKey)
}

function getUserFromToken(token: string) {
  try {
    const tokenVerified = verify(token)
    const tokenParsed = parseTokenPayload(tokenVerified)

    return tokenParsed.user
  } catch {
    return null
  }
}

export const authenticatedProcedure = publicProcedure.use(({ ctx, next }) => {
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

  const authUser = getUserFromToken(token)

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
})

import * as path from 'node:path'
import { initTRPC } from '@trpc/server'
import type { Request, Response } from 'express'
import type { UserPublic } from '@server/entities/user'
import type { Database } from '@server/database'
import SuperJSON from 'superjson'
import { ZodError } from 'zod'
import { fromZodError } from 'zod-validation-error'
import type { Repositories } from '@server/repositories'
import logger from '@server/utils/logger'
import type { AuthService } from '@server/middleware/authService'

export type Context = {
  db: Database

  // Express types. These are optional as
  // vast majority of requests do not need them.
  // Then it is a bit easier to test procedures.
  req?: Request
  res?: Response

  // We can also add our own custom context properties.
  authUser?: UserPublic

  // For providing repos in a slightly easier to test way
  repos?: Partial<Repositories>
  authService?: AuthService
}

export type ContextMinimal = Pick<Context, 'db'>

export const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
  errorFormatter(opts) {
    const { shape, error } = opts

    if (error.cause instanceof ZodError) {
      const validationError = fromZodError(error.cause)
      logger.warn('Zod validation failed', {
        path,
        code: error.code,
        message: validationError.message,
        issues: error.cause.issues,
        details: validationError.details,
      })

      return {
        ...shape,
        data: {
          message: validationError.message,
        },
      }
    }

    return shape
  },
})

export const {
  createCallerFactory,
  mergeRouters,
  middleware,
  procedure: publicProcedure,
  router,
} = t

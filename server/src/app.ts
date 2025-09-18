import express from 'express'
import {
  createExpressMiddleware,
  type CreateExpressContextOptions,
} from '@trpc/server/adapters/express'
import cors from 'cors'
import morganMiddleware from './middleware/morganMiddleware'
import logger from './utils/logger'
import type { Database } from './database'
import { appRouter } from './controllers'
import type { Context } from './trpc'
// import { renderTrpcPanel } from 'trpc-panel'
// import config from './config'

export default function createApp(db: Database) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Endpoint for health checks - pinging the server to see if it's alive.
  // This can be used by tests, load balancers, monitoring tools, etc.
  app.use('/api/health', (_, res) => {
    res.status(200).send('OK')
  })

  app.use(morganMiddleware)

  // Using TRPC router, which will live under /api/v1/trpc
  // path. It will be used for all our procedures.
  app.use(
    '/api/v1/trpc',
    createExpressMiddleware({
      // Created context for each request, which we will be able to
      // access in our procedures.
      createContext: ({ req, res }: CreateExpressContextOptions): Context => ({
        // What we provide to our procedures under `ctx` key.
        db,
        req,
        res,
      }),
      onError({ error, path, type, input, ctx }) {
        logger.error('tRPC error', {
          message: error.message,
          code: error.code,
          path,
          type,
          input,
          cause: error.cause,
          stack: error.stack,
          user: ctx?.authUser?.id,
        })
      },

      // all routes
      router: appRouter,
    })
  )

  // incompatibility with tRPC v10
  // if (config.env === 'development') {
  //   app.use('/api/v1/trpc-panel', (_, res) =>
  //     res.send(
  //       renderTrpcPanel(appRouter, {
  //         url: `http://localhost:${config.port}/api/v1/trpc`,
  //         transformer: 'superjson',
  //       })
  //     )
  //   )
  // }

  return app
}

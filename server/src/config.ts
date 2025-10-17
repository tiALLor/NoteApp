import 'dotenv/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'
import type { Secret } from 'jsonwebtoken'

// Load .env from the server folder explicitly
// eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../../server/.env') })

const { env } = process

if (!env.NODE_ENV) env.NODE_ENV = 'development'

// force UTC timezone, so it matches the default timezone in production
env.TZ = 'UTC'

const isTest = env.NODE_ENV === 'test'
const isDevTest = env.NODE_ENV === 'development' || isTest

const jwtExpirySchema = z.union([
  z.number(),
  z.string().regex(/^\d+(ms|s|m|h|d|w|y)$/), // e.g. "1h", "30m", "7d"
])

const schema = z
  .object({
    env: z
      .enum(['development', 'production', 'staging', 'test'])
      .default('development'),
    isCi: z.preprocess(coerceBoolean, z.boolean().default(false)),
    port: z.coerce.number().default(3000),

    auth: z.object({
      botApiKey: z.string(),
      tokenKey: z
        .string()
        .default(() => {
          if (isDevTest) {
            return 'superSecretKey'
          }

          throw new Error('You must provide a TOKEN_KEY in a production env!')
        })
        .transform((val) => val as Secret), // Cast to Secret for JWT typing,
      refreshTokenKey: z
        .string()
        .default(() => {
          if (isDevTest) {
            return 'superRefreshSecretKey'
          }

          throw new Error('You must provide a TOKEN_KEY in a production env!')
        })
        .transform((val) => val as Secret), // Cast to Secret for JWT typing,
      tokenExpiresIn: jwtExpirySchema.default('1h'),
      refreshTokenExpiresIn: jwtExpirySchema.default('7d'),
      passwordCost: z.coerce.number().default(isDevTest ? 6 : 12),
      passwordPepper: z.string().default('abc123'),
    }),

    database: z.object({ connectionString: z.string().url() }),
  })
  .readonly()

const configData = schema.parse({
  env: env.NODE_ENV,
  port: env.PORT,
  isCi: env.CI,

  auth: {
    botApiKey: env.BOT_API_KEY,
    tokenKey: env.TOKEN_KEY,
    refreshTokenKey: env.REFRESH_TOKEN_KEY,
    tokenExpiresIn: env.TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    passwordCost: env.PASSWORD_COST,
    passwordPepper: env.PASSWORD_PEPPER,
  },

  database: { connectionString: env.DATABASE_URL },
})

export default configData

// utility functions
function coerceBoolean(value: unknown) {
  if (typeof value === 'string') {
    return value === 'true' || value === '1'
  }

  return undefined
}

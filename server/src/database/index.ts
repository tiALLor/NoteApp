import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  PostgresDialect,
} from 'kysely'
import pg from 'pg'
import type { DB } from './types'

// override the default parser for PostgreSQL's DATE type, to return the raw string value instead of Date obj
pg.types.setTypeParser(1082, (val) => val)

export function createDatabase(options: pg.PoolConfig): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool(options),
    }),
    plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
  })
}

export type Database = Kysely<DB>
export type DatabasePartial<T> = Kysely<T>
export * from './types'

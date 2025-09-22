import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  PostgresDialect,
} from 'kysely'
import pg from 'pg'
import pgvector from 'pgvector/pg'
import type { DB } from './types'

// override the default parser for PostgreSQL's DATE type, to return the raw string value instead of Date obj
pg.types.setTypeParser(1082, (val) => val)

export function createDatabase(options: pg.PoolConfig): Kysely<DB> {
  const pool = new pg.Pool(options)

  pool.on('connect', async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')
    await pgvector.registerTypes(client)
  })

  // TODO: remove commented code
  // temporary client to register vector type
  // const client = await pool.connect()
  // try {
  //   await pgvector.registerType(client)
  // } finally {
  //   client.release()
  // }

  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool,
    }),
    plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
  })
}

export type Database = Kysely<DB>
export type DatabasePartial<T> = Kysely<T>
export * from './types'

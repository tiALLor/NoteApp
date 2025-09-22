/* eslint-disable no-console */
import 'dotenv/config'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  FileMigrationProvider,
  Migrator,
  type Kysely,
  type MigrationProvider,
} from 'kysely'
import config from '@server/config'
import { createDatabase } from '..'

const MIGRATIONS_PATH = '../migrations'

async function migrateOneDown(db: Kysely<any>) {
  const dirname = path.dirname(fileURLToPath(import.meta.url))

  const nodeProvider = new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(dirname, MIGRATIONS_PATH),
  })

  const { results, error } = await migrateDown(nodeProvider, db)

  if (!results?.length && !error) {
    console.log('No migrations to run.')
  }

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.info(
        `Migration "${it.migrationName}" was rolled back successfully.`
      )
    } else if (it.status === 'Error') {
      console.error(
        `Failed to execute migration roll back "${it.migrationName}".`
      )
    }
  })

  if (error) {
    console.error('Failed to migrate.')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

export async function migrateDown(
  provider: MigrationProvider,
  db: Kysely<any>
) {
  const migrator = new Migrator({
    db,
    provider,
  })

  return migrator.migrateDown()
}

const pathToThisFile = path.resolve(fileURLToPath(import.meta.url))
const pathPassedToNode = path.resolve(process.argv[1])
const isFileRunDirectly = pathToThisFile.includes(pathPassedToNode)

if (isFileRunDirectly) {
  const db = createDatabase(config.database)

  await migrateOneDown(db)
}

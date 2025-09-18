import type { Kysely } from 'kysely'
import { getPasswordHash } from '@server/utils/hash'
import config from '@server/config'

const INITIAL_ADMIN_PASSWORD_HASH = await getPasswordHash(config.admin.password)

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('role')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedByDefaultAsIdentity()
    )
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .execute()

  await db
    .insertInto('role')
    .values([
      { id: 1, name: 'admin' },
      { id: 2, name: 'chef' },
      { id: 3, name: 'user' },
    ])
    .execute()

  await db.schema
    .createTable('user')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedByDefaultAsIdentity()
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('password', 'text', (col) => col.notNull())
    .addColumn('roleId', 'integer', (col) =>
      col.notNull().references('role.id').onDelete('restrict')
    )
    .execute()

  await db
    .insertInto('user')
    .values({
      id: 1,
      name: 'admin',
      email: config.admin.email,
      password: INITIAL_ADMIN_PASSWORD_HASH,
      roleId: 1,
    })
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('user').cascade().execute()
  await db.schema.dropTable('role').cascade().execute()
}

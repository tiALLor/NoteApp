import { sql, type Kysely } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('user')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedByDefaultAsIdentity()
    )
    .addColumn('email', 'varchar(100)', (col) => col.notNull())
    .addColumn('userName', 'varchar(100)', (col) => col.notNull())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .addColumn('last_login', 'timestamptz')
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('user').cascade().execute()
}

import { sql, type Kysely } from 'kysely'

// TODO: change to import from Embeddings service
// cohere embedding service
const vectorSize = 1536

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('note_board')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedByDefaultAsIdentity().notNull()
    )
    .addColumn('title', 'varchar(50)', (col) =>
      col.defaultTo('general').notNull()
    )
    .addColumn('owner_id', 'integer', (col) =>
      col.references('user.id').onDelete('cascade').notNull()
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  await db.schema
    .createTable('note')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedByDefaultAsIdentity().notNull()
    )
    .addColumn('board_id', 'integer', (col) =>
      col.references('note_board.id').onDelete('cascade').notNull()
    )
    .addColumn('content', 'text', (col) => col.defaultTo('').notNull())
    .addColumn('content_embedding', sql.raw(`vector(${vectorSize})`))
    .addColumn('isDone', 'boolean', (col) => col.defaultTo('false').notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
    )
    .execute()

  await db.schema
    .createTable('board_collaborator')
    .ifNotExists()
    .addColumn('board_id', 'integer', (col) =>
      col.references('note_board.id').onDelete('cascade').notNull()
    )
    .addColumn('user_id', 'integer', (col) =>
      col.references('user.id').onDelete('cascade').notNull()
    )
    .addPrimaryKeyConstraint('board_collaborators_pk', ['board_id', 'user_id'])
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('board_collaborator').execute()
  await db.schema.dropTable('note').execute()
  await db.schema.dropTable('note_board').execute()
}

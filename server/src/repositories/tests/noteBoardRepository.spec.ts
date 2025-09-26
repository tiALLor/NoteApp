import { omit } from 'lodash-es'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from '@server/database'
import { createTestDatabase } from '@tests/utils/database'
import { selectAll, insertAll } from '@tests/utils/records'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { fakeNoteBoard, fakeUserWithHash } from '@server/entities/tests/fakes'
import { random } from '@tests/utils/random'
import type {
  NoteBoardInsertable,
  NoteBoardPublic,
} from '@server/entities/noteBoard'
import { noteBoardRepository } from '../noteBoardRepository'

// ===========================================
// SETUP
// ===========================================

let db: Database
try {
  db = await wrapInRollbacks(createTestDatabase())
} catch {
  console.log('Console Error: Please provide database')
  process.exit(1)
}

const repository = noteBoardRepository(db)

await db.deleteFrom('boardCollaborator').execute()
await db.deleteFrom('note').execute()
await db.deleteFrom('noteBoard').execute()
await db.deleteFrom('user').execute()

const [testUser] = await insertAll(db, 'user', [fakeUserWithHash()])

const testNoteBoard: NoteBoardInsertable = {
  title: random.string(),
  ownerId: testUser.id,
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
}

const testNoteBoardPublic: NoteBoardPublic = {
  id: expect.any(Number),
  ownerId: testUser.id,
  title: testNoteBoard.title,
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
}

const testNoteBoardComplete = {
  ...testNoteBoardPublic,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

beforeEach(async () => {
  await db.deleteFrom('noteBoard').execute()
})

// ===========================================
// CREATE NOTE BOARD
// ===========================================
describe('create noteBoard', () => {
  it('should create noteBoard with all parameters', async () => {
    const result = await repository.createNoteBoard({
      ...testNoteBoard,
    })

    expect(result).toEqual({ ...testNoteBoardPublic })

    // check directly in database
    const [noteBoardInDatabase] = await selectAll(db, 'noteBoard', (eb) =>
      eb('id', '=', result.id)
    )

    expect(noteBoardInDatabase).toEqual({
      ...testNoteBoardComplete,
    })
  })

  it('should create noteBoard with min set up', async () => {
    const result = await repository.createNoteBoard(
      omit(testNoteBoard, ['createdAt'])
    )

    expect(result).toEqual({
      ...testNoteBoardPublic,
      createdAt: expect.anything(),
    })

    // check directly in database
    const [noteBoardInDatabase] = await selectAll(db, 'noteBoard', (eb) =>
      eb('id', '=', result.id)
    )

    expect(noteBoardInDatabase).toEqual({
      ...testNoteBoardComplete,
      createdAt: expect.any(Date),
    })
  })

  it('should throw a error if ownerId do not exist', async () => {
    const record = {
      ...testNoteBoard,
      ownerId: 9999,
    }

    await expect(repository.createNoteBoard(record)).rejects.toThrow(
      /violates foreign key constraint/i
    )
  })
})

// ===========================================
// UPDATE NOTE BOARD TITLE
// ===========================================
describe('updateNoteBoardTitle', () => {
  it('should update content', async () => {
    const noteBoard = await repository.createNoteBoard(testNoteBoard)

    const record = {
      id: noteBoard.id,
      title: random.string(),
    }

    const result = await repository.updateNoteBoardTitle(record)

    expect(result).toEqual({ ...testNoteBoardPublic, ...record })

    // check directly in database
    const [noteBoardInDatabase] = await selectAll(db, 'noteBoard', (eb) =>
      eb('id', '=', noteBoard.id)
    )

    expect(noteBoardInDatabase.title).toEqual(record.title)
  })

  it('should throw a error if note do not exist', async () => {
    const record = {
      id: 999999,
      title: random.string(),
    }

    await expect(repository.updateNoteBoardTitle(record)).rejects.toThrow(
      /Not Found/i
    )
  })
})

// ===========================================
// DELETE NOTE BOARD BY ID
// ===========================================
describe('deleteNoteBoardById', () => {
  it('should delete a note base on id', async () => {
    const noteBoardToBeDeleted = await repository.createNoteBoard(testNoteBoard)

    const result = await repository.deleteNoteBoardById(noteBoardToBeDeleted.id)

    expect(result).toEqual(testNoteBoardPublic)

    // check directly in database
    const [noteBoardInDatabase] = await selectAll(db, 'noteBoard', (eb) =>
      eb('id', '=', noteBoardToBeDeleted.id)
    )
    expect(noteBoardInDatabase).toBeUndefined()
  })

  it('should return undefined if user do not exist', async () => {
    await expect(repository.deleteNoteBoardById(99999)).rejects.toThrow(
      /NoteBoard Not Found/i
    )
  })
})

// ===========================================
// GET NOTE BOARDS BY ownerID (with Owner Name)
// ===========================================
describe('get noteBoards by ownerId with userName', () => {
  it('should return noteBoards with user name', async () => {
    // arrange
    await repository.createNoteBoard(testNoteBoard)

    const result = await repository.getNoteBoardsByOwnerIdWithUser(testUser.id)

    expect(result).toHaveLength(1)
    expect(result).toEqual([
      expect.objectContaining({
        ...testNoteBoardPublic,
        ownerUserName: testUser.userName,
      }),
    ])
  })

  it('should return noteBoards with user name by more options', async () => {
    // arrange
    const [testUser2] = await insertAll(db, 'user', [fakeUserWithHash()])
    const noteBoard1 = await repository.createNoteBoard(testNoteBoard)
    const noteBoard2 = await repository.createNoteBoard(
      fakeNoteBoard({ ownerId: testUser.id })
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noteBoard3 = await repository.createNoteBoard(
      fakeNoteBoard({ ownerId: testUser2.id })
    )

    const result = await repository.getNoteBoardsByOwnerIdWithUser(testUser.id)

    expect(result).toHaveLength(2)
    expect(result.map((board) => board.id)).toEqual(
      expect.arrayContaining([noteBoard1.id, noteBoard2.id])
    )
  })

  it('should return [] if no notes exist', async () => {
    const result = await repository.getNoteBoardsByOwnerIdWithUser(testUser.id)

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})

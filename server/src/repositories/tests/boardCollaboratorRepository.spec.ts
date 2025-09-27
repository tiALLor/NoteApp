import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from '@server/database'
import { createTestDatabase } from '@tests/utils/database'
import { selectAll, insertAll } from '@tests/utils/records'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { fakeUserWithHash } from '@server/entities/tests/fakes'
import { random } from '@tests/utils/random'
import type {
  BoardCollaboratorInsertable,
  BoardCollaboratorPublic,
} from '@server/entities/boardCollaborator'
import { boardCollaboratorRepository } from '../boardCollaboratorRepository'

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

const repository = boardCollaboratorRepository(db)

await db.deleteFrom('boardCollaborator').execute()
await db.deleteFrom('note').execute()
await db.deleteFrom('noteBoard').execute()
await db.deleteFrom('user').execute()

const [testUser] = await insertAll(db, 'user', [fakeUserWithHash()])
const [testUserCollaborator1] = await insertAll(db, 'user', [
  fakeUserWithHash(),
])
const [testUserCollaborator2] = await insertAll(db, 'user', [
  fakeUserWithHash(),
])

const [testNoteBoard] = await insertAll(db, 'noteBoard', [
  {
    ownerId: testUser.id,
    title: random.string(),
  },
])

const testCollaborator: BoardCollaboratorInsertable = {
  boardId: testNoteBoard.id,
  userId: testUserCollaborator1.id,
}

const testCollaborator2: BoardCollaboratorInsertable = {
  boardId: testNoteBoard.id,
  userId: testUserCollaborator2.id,
}

const testCollaboratorPublic: BoardCollaboratorPublic = {
  boardId: testNoteBoard.id,
  userId: testUserCollaborator1.id,
}

beforeEach(async () => {
  await db.deleteFrom('boardCollaborator').execute()
})

// ===========================================
// ADD COLLABORATOR TO NOTE BOARD
// ===========================================
describe('add collaborator to noteBoard', () => {
  it('should add collaborator to noteBoard', async () => {
    const result = await repository.addCollaborator(testCollaborator)

    expect(result).toEqual(testCollaboratorPublic)

    // check directly in database
    const [collaboratorInDatabase] = await selectAll(
      db,
      'boardCollaborator',
      (eb) => eb('boardId', '=', testCollaborator.boardId)
    )

    expect(collaboratorInDatabase).toEqual(testCollaboratorPublic)
  })
})

// ===========================================
// REMOVE COLLABORATOR FROM NOTE BOARD
// ===========================================
describe('Remove collaborator from noteBoard', () => {
  it('should remove collaborator from noteBoard', async () => {
    await repository.addCollaborator(testCollaborator2)
    await repository.addCollaborator(testCollaborator)

    const result = await repository.removeCollaborator(testCollaborator)

    expect(result).toEqual(testCollaboratorPublic)

    // check directly in database
    const [collaboratorInDatabase] = await selectAll(
      db,
      'boardCollaborator',
      (eb) => eb('boardId', '=', testCollaborator.boardId)
    )

    expect(collaboratorInDatabase).toEqual(testCollaborator2)
  })

  it('should throw a error if collaborator from noteBoard do not exist', async () => {
    await repository.addCollaborator(testCollaborator2)

    await expect(
      repository.removeCollaborator(testCollaborator)
    ).rejects.toThrow(/Collaborator Not Found/i)
  })
})

// ===========================================
// GET COLLABORATORS WITH USERNAME FOR BOARD ID
// ===========================================
describe('get collaborator with user name for ', () => {
  it('should remove collaborator from noteBoard by more options', async () => {
    await repository.addCollaborator(testCollaborator)

    const result = await repository.getCollaboratorByBoardId(testNoteBoard.id)

    expect(result).toEqual([
      {
        ...testCollaborator,
        collaboratorUserName: testUserCollaborator1.userName,
      },
    ])

    // check directly in database
    const [collaboratorInDatabase] = await selectAll(
      db,
      'boardCollaborator',
      (eb) => eb('boardId', '=', testCollaborator.boardId)
    )

    expect(collaboratorInDatabase).toEqual(testCollaborator)
  })

  it('should remove collaborator from noteBoard by more options', async () => {
    await repository.addCollaborator(testCollaborator2)
    await repository.addCollaborator(testCollaborator)

    const result = await repository.getCollaboratorByBoardId(testNoteBoard.id)

    expect(result).toHaveLength(2)
    expect(result.map((board) => board.boardId)).toEqual(
      expect.arrayContaining([
        testCollaborator.boardId,
        testCollaborator2.boardId,
      ])
    )
  })

  it('should return [] if collaborator for noteBoard do not exist', async () => {
    const result = await repository.getCollaboratorByBoardId(testNoteBoard.id)

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})

import { omit } from 'lodash-es'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Note, Database } from '@server/database'
import type { Selectable } from 'kysely'
import { createTestDatabase } from '@tests/utils/database'
import { selectAll, insertAll } from '@tests/utils/records'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { fakeNote, fakeUserWithHash } from '@server/entities/tests/fakes'
import { random, randomVector } from '@tests/utils/random'
import type { NoteInsertable, NotePublic } from '@server/entities/note'
import { noteRepository } from '../noteRepository'

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

const repository = noteRepository(db)

await db.deleteFrom('boardCollaborator').execute()
await db.deleteFrom('note').execute()
await db.deleteFrom('noteBoard').execute()
await db.deleteFrom('user').execute()


const [testUser] = await insertAll(db, 'user', [fakeUserWithHash()])

const [testNoteBoard] = await insertAll(db, 'noteBoard', [
  {
    ownerId: testUser.id,
    title: random.string(),
  },
])

// TODO: change to import from Embeddings service
// cohere embedding service
const vectorSize = 1536
const testVector = randomVector(vectorSize)

const testNote: NoteInsertable = {
  boardId: testNoteBoard.id,
  content: random.toString(),
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
}

const testNoteOptionals = {
  id: 120,
  isDone: true,
  contentEmbedding: testVector,
}

const testNotePublic: NotePublic = {
  id: expect.any(Number),
  boardId: testNoteBoard.id,
  content: testNote.content,
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  isDone: false,
}

const testNoteComplete: Selectable<Note> = {
  id: expect.any(Number),
  boardId: testNoteBoard.id,
  content: testNote.content,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  contentEmbedding: null,
  isDone: false,
}

beforeEach(async () => {
  await db.deleteFrom('note').execute()
})

// ===========================================
// CREATE NOTE
// ===========================================
describe('create note', () => {
  it('should create note with all parameters', async () => {
    const result = await repository.createNote({
      ...testNote,
      ...testNoteOptionals,
    })

    expect(result).toEqual({ ...testNotePublic, isDone: true })

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', result.id)
    )

    expect(noteInDatabase).toEqual({
      ...testNoteComplete,
      isDone: true,
      contentEmbedding: expect.any(Array),
    })
  })

  it('should create note with min set up', async () => {
    const result = await repository.createNote(omit(testNote, ['createdAt']))

    expect(result).toEqual({
      ...testNotePublic,
      createdAt: expect.anything(),
      isDone: false,
    })

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', result.id)
    )

    expect(noteInDatabase).toEqual({
      ...testNoteComplete,
      createdAt: expect.any(Date),
    })
  })

  it('should create note with min set up', async () => {
    const result = await repository.createNote(testNote)

    expect(result).toEqual(testNotePublic)

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', result.id)
    )

    expect(noteInDatabase).toEqual(testNoteComplete)
  })

  it('should throw a error if owner do not exist', async () => {
    const record = {
      ...testNote,
      boardId: 9999,
    }

    await expect(repository.createNote(record)).rejects.toThrow(
      /violates foreign key constraint/i
    )
  })
})

// ===========================================
// UPDATE NOTE EMBEDDING
// ===========================================
describe('updateNoteEmbedding', () => {
  it('should update embedding', async () => {
    const note = await repository.createNote(testNote)

    await repository.updateNoteEmbedding({
      id: note.id,
      contentEmbedding: testVector,
    })

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', note.id)
    )

    expect(noteInDatabase.contentEmbedding).toHaveLength(testVector.length)
    expect(noteInDatabase.id).toEqual(note.id)
  })

  it('should throw a error if note do not exist', async () => {
    await expect(
      repository.updateNoteEmbedding({
        id: 99999,
        contentEmbedding: testVector,
      })
    ).rejects.toThrow(/Not Found/i)
  })
})

// ===========================================
// UPDATE NOTE CONTENT
// ===========================================
describe('updateNoteContent', () => {
  it('should update content', async () => {
    const note = await repository.createNote(testNote)

    const record = {
      id: note.id,
      content: random.string(),
    }

    const result = await repository.updateNoteContent(record)

    expect(result).toEqual({ ...testNotePublic, ...record })

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', note.id)
    )

    expect(noteInDatabase.content).toEqual(record.content)
  })

  it('should throw a error if note do not exist', async () => {
    const record = {
      id: 999999,
      content: random.string(),
    }

    await expect(repository.updateNoteContent(record)).rejects.toThrow(
      /Not Found/i
    )
  })
})

// ===========================================
// UPDATE NOTES IS DONE
// ===========================================
describe('updateNoteIsDoneByID', () => {
  it('should update isDone', async () => {
    const note = await repository.createNote(testNote)

    const record = {
      id: note.id,
      isDone: true,
    }

    const result = await repository.updateNoteIsDoneByID(record)

    expect(result).toEqual({ ...testNotePublic, ...record })

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', note.id)
    )

    expect(noteInDatabase.isDone).toEqual(record.isDone)
  })

  it('should throw a error if note do not exist', async () => {
    const record = {
      id: 999999,
      isDone: true,
    }

    await expect(repository.updateNoteIsDoneByID(record)).rejects.toThrow(
      /Not Found/i
    )
  })
})

// ===========================================
// DELETE NOTE BY ID
// ===========================================
describe('deleteNoteById', () => {
  it('should delete a note base on id', async () => {
    const noteToBeDeleted = await repository.createNote(testNote)

    const result = await repository.deleteNoteById(noteToBeDeleted.id)

    expect(result).toEqual(testNotePublic)

    // check directly in database
    const [noteInDatabase] = await selectAll(db, 'note', (eb) =>
      eb('id', '=', noteToBeDeleted.id)
    )
    expect(noteInDatabase).toBeUndefined()
  })

  it('should return undefined if user do not exist', async () => {
    await expect(repository.deleteNoteById(99999)).rejects.toThrow(
      /Note Not Found/i
    )
  })
})

// ===========================================
// GET NOTES BY noteBoardID
// ===========================================
describe('get notes by noteBoardId', () => {
  it('should return noteBoards with noteBoardId', async () => {
    // arrange
    await repository.createNote(testNote)

    const result = await repository.getNotesByNoteBoardId(testNoteBoard.id)

    expect(result).toHaveLength(1)
    expect(result).toEqual([expect.objectContaining(testNotePublic)])
  })

  it('should return notes with user name by more options', async () => {
    // arrange
    const [testUser2] = await insertAll(db, 'user', [fakeUserWithHash()])
    const [testNoteBoard2] = await insertAll(db, 'noteBoard', [
      {
        ownerId: testUser2.id,
        title: random.string(),
      },
    ])

    const note1 = await repository.createNote(testNote)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const note2 = await repository.createNote(
      fakeNote({ boardId: testNoteBoard2.id })
    )
    const note3 = await repository.createNote(
      fakeNote({ boardId: testNoteBoard.id })
    )

    const result = await repository.getNotesByNoteBoardId(testNoteBoard.id)

    expect(result).toHaveLength(2)
    expect(result.map((board) => board.id)).toEqual(
      expect.arrayContaining([note1.id, note3.id])
    )
  })

  it('should return [] if no notes exist', async () => {
    const result = await repository.getNotesByNoteBoardId(testUser.id)

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})

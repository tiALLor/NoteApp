import { omit, pick } from 'lodash-es'
import { randomVector } from '@tests/utils/random'
import {
  noteSchema,
  noteInsertableSchema,
  noteUpdateableSchema,
  notePublicSchema,
  NoteIsDoneUpdateableSchema,
  noteEmbUpdateableSchema,
} from '../note'
import { fakeNote } from './fakes'

// TODO: change to import from Embeddings service
// cohere embedding service
const vectorSize = 1536

describe('noteSchema - schema parse', () => {
  it('should validate note correctly', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(noteSchema.parse(record)).toEqual({ ...record, isDone: false })
  })

  it('should validate note with createdAt correctly', async () => {
    const createdAt = new Date().toISOString()
    const record = { ...fakeNote(), id: 123, createdAt }
    expect(noteSchema.parse(record)).toEqual({
      ...record,
      isDone: false,
      createdAt,
    })
  })

  it('should throw a error by missing value', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse(omit(record, ['id']))).toThrow(/id/i)

    expect(() => noteSchema.parse(omit(record, ['boardId']))).toThrow(
      /boardId/i
    )

    expect(() => noteSchema.parse(omit(record, ['content']))).toThrow(
      /content/i
    )
  })

  it('should throw a error by empty value', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse({ ...record, id: '' })).toThrow(/id/i)

    expect(() => noteSchema.parse({ ...record, boardId: '' })).toThrow(
      /boardId/i
    )

    expect(() => noteSchema.parse({ ...record, content: '' })).toThrow(
      /content/i
    )

    expect(() => noteSchema.parse({ ...record, contentEmbedding: '' })).toThrow(
      /contentEmbedding/i
    )
  })

  it('should throw a error by space as string value', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse({ ...record, content: ' ' })).toThrow(
      /content/i
    )
  })

  it('should throw a error by incorrect id', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse({ ...record, id: 0 })).toThrow(/id/i)

    expect(() => noteSchema.parse({ ...record, id: -1 })).toThrow(/id/i)

    expect(() => noteSchema.parse({ ...record, id: 0.1 })).toThrow(/id/i)

    expect(() => noteSchema.parse({ ...record, id: 'dsikl' })).toThrow(/id/i)
  })

  it('should throw a error by incorrect boardId', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse({ ...record, boardId: 0 })).toThrow(
      /boardId/i
    )

    expect(() => noteSchema.parse({ ...record, boardId: -1 })).toThrow(
      /boardId/i
    )

    expect(() => noteSchema.parse({ ...record, boardId: 0.1 })).toThrow(
      /boardId/i
    )

    expect(() => noteSchema.parse({ ...record, boardId: 'dsikl' })).toThrow(
      /boardId/i
    )
  })

  it('should throw a error by incorrect contentEmbedding', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() =>
      noteSchema.parse({ ...record, contentEmbedding: 0.1 })
    ).toThrow(/contentEmbedding/i)

    expect(() =>
      noteSchema.parse({ ...record, contentEmbedding: 'dfhsjgfd' })
    ).toThrow(/contentEmbedding/i)
  })

  it('should throw a error by incorrect isDone', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(() => noteSchema.parse({ ...record, isDone: 0.1 })).toThrow(
      /isDone/i
    )

    expect(() => noteSchema.parse({ ...record, isDone: 'dfhsjgfd' })).toThrow(
      /isDone/i
    )
  })
})

describe('insertableNoteSchema', () => {
  it('should parse insertable correctly', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(noteInsertableSchema.parse(record)).toEqual(
      pick(record, ['boardId', 'content', 'contentEmbedding'])
    )
  })
})

describe('noteUpdateableSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(noteUpdateableSchema.parse(record)).toEqual(
      pick(record, ['id', 'content'])
    )
  })
})

describe('NoteIsDoneUpdateableSchema', () => {
  it('should parse isDone: true correctly', async () => {
    const record = { id: 123, isDone: true }

    expect(NoteIsDoneUpdateableSchema.parse(record)).toEqual(record)
  })

  it('should parse isDone: false correctly', async () => {
    const record = { id: 123, isDone: false }

    expect(NoteIsDoneUpdateableSchema.parse(record)).toEqual(record)
  })

  it('should throw a error by string', async () => {
    const record = { id: 123, isDone: 'false' }

    expect(() => NoteIsDoneUpdateableSchema.parse(record)).toThrow(/isDone/i)
  })
})

describe('noteEmbUpdateableSchema', () => {
  it('should parse publicSchema correctly', async () => {
    const record = {
      id: 123,
      contentEmbedding: randomVector(vectorSize),
    }

    expect(noteEmbUpdateableSchema.parse(record)).toEqual(record)
  })

  it('should throw a error by missing value', async () => {
    const record = {}

    expect(() => noteEmbUpdateableSchema.parse(record)).toThrow(
      /contentEmbedding/i
    )
  })
})

describe('notePublicSchema', () => {
  it('should parse publicSchema correctly', async () => {
    const record = {
      ...fakeNote(),
      id: 123,
      isDone: false,
      createdAt: new Date().toISOString(),
    }

    expect(notePublicSchema.parse(record)).toEqual(
      omit(record, ['contentEmbedding'])
    )
  })
})

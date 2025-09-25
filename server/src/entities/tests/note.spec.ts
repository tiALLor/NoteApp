import { omit, pick } from 'lodash-es'
import {
  noteSchema,
  noteInsertableSchema,
  changeNoteSchema,
  publicNoteSchema,
  changeIsDoneNoteSchema,
} from '../note'
import { fakeNote } from './fakes'

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

    expect(() => noteSchema.parse(omit(record, ['contentEmbedding']))).toThrow(
      /contentEmbedding/i
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

describe('changeNoteSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = { ...fakeNote(), id: 123 }

    expect(changeNoteSchema.parse(record)).toEqual(
      pick(record, ['content', 'contentEmbedding'])
    )
  })
})

describe('publicNoteSchema', () => {
  it('should parse selectable correctly', async () => {
    const record = {
      ...fakeNote(),
      id: 123,
      isDone: false,
      createdAt: new Date().toISOString(),
    }

    expect(publicNoteSchema.parse(record)).toEqual(
      omit(record, ['contentEmbedding'])
    )
  })
})

describe('changeIsDoneNoteSchema', () => {
  it('should parse isDone: true correctly', async () => {
    const record = { isDone: true }

    expect(changeIsDoneNoteSchema.parse(record)).toEqual(record)
  })

  it('should parse isDone: false correctly', async () => {
    const record = { isDone: false }

    expect(changeIsDoneNoteSchema.parse(record)).toEqual(record)
  })

  it('should throw a error by string', async () => {
    const record = { isDone: 'false' }

    expect(() => changeIsDoneNoteSchema.parse(record)).toThrow(/isDone/i)
  })
})

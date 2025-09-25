import { omit, pick } from 'lodash-es'
import {
  noteBoardSchema,
  noteBoardInsertableSchema,
  noteBoardUpdateableSchema,
  noteBoardPublicSchema,
} from '../noteBoard'
import { fakeNoteBoard } from './fakes'

describe('noteSchema - schema parse', () => {
  it('should validate noteBoard correctly', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(noteBoardSchema.parse(record)).toEqual(record)
  })

  it('should validate noteBoard with createdAt correctly', async () => {
    const createdAt = new Date().toISOString()
    const record = { ...fakeNoteBoard(), id: 123, createdAt }

    expect(noteBoardSchema.parse(record)).toEqual({ ...record, createdAt })
  })

  it('should throw a error by missing value', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(() => noteBoardSchema.parse(omit(record, ['id']))).toThrow(/id/i)

    expect(() => noteBoardSchema.parse(omit(record, ['title']))).toThrow(
      /title/i
    )

    expect(() => noteBoardSchema.parse(omit(record, ['ownerId']))).toThrow(
      /ownerId/i
    )
  })

  it('should throw a error by empty value', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(() => noteBoardSchema.parse({ ...record, id: '' })).toThrow(/id/i)

    expect(() => noteBoardSchema.parse({ ...record, title: '' })).toThrow(
      /title/i
    )

    expect(() => noteBoardSchema.parse({ ...record, ownerId: '' })).toThrow(
      /ownerId/i
    )
  })

  it('should throw a error by space as string value', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(() => noteBoardSchema.parse({ ...record, title: ' ' })).toThrow(
      /title/i
    )
  })

  it('should throw a error by incorrect id', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(() => noteBoardSchema.parse({ ...record, id: 0 })).toThrow(/id/i)

    expect(() => noteBoardSchema.parse({ ...record, id: -1 })).toThrow(/id/i)

    expect(() => noteBoardSchema.parse({ ...record, id: 0.1 })).toThrow(/id/i)

    expect(() => noteBoardSchema.parse({ ...record, id: 'dsikl' })).toThrow(
      /id/i
    )
  })

  it('should throw a error by incorrect ownerId', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(() => noteBoardSchema.parse({ ...record, ownerId: 0 })).toThrow(
      /ownerId/i
    )

    expect(() => noteBoardSchema.parse({ ...record, ownerId: -1 })).toThrow(
      /ownerId/i
    )

    expect(() => noteBoardSchema.parse({ ...record, ownerId: 0.1 })).toThrow(
      /ownerId/i
    )
  })
})

describe('insertableNoteSchema', () => {
  it('should parse insertable correctly', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(noteBoardInsertableSchema.parse(record)).toEqual(
      pick(record, ['title', 'ownerId'])
    )
  })
})

describe('noteBoardUpdateableSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = { ...fakeNoteBoard(), id: 123 }

    expect(noteBoardUpdateableSchema.parse(record)).toEqual(
      pick(record, ['title'])
    )
  })
})

describe('noteBoardPublicSchema', () => {
  it('should parse publicSchema correctly', async () => {
    const record = {
      ...fakeNoteBoard(),
      id: 123,
      createdAt: new Date().toISOString(),
    }

    expect(noteBoardPublicSchema.parse(record)).toEqual(record)
  })
})

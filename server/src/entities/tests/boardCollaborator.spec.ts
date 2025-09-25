import { omit } from 'lodash-es'
import {
  boardCollaboratorSchema,
  boardCollaboratorInsertableSchema,
  boardCollaboratorUpdateableSchema,
  boardCollaboratorPublicSchema,
} from '../boardCollaborator'
import { fakeBoardCollaborator } from './fakes'

describe('noteSchema - schema parse', () => {
  it('should validate noteBoard correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(boardCollaboratorSchema.parse(record)).toEqual(record)
  })

  it('should throw a error by missing value', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(() =>
      boardCollaboratorSchema.parse(omit(record, ['boardId']))
    ).toThrow(/boardId/i)

    expect(() =>
      boardCollaboratorSchema.parse(omit(record, ['userId']))
    ).toThrow(/userId/i)
  })

  it('should throw a error by empty value', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, boardId: '' })
    ).toThrow(/boardId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, userId: '' })
    ).toThrow(/userId/i)
  })

  it('should throw a error by incorrect boardId', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, boardId: 0 })
    ).toThrow(/boardId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, boardId: -1 })
    ).toThrow(/boardId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, boardId: 0.1 })
    ).toThrow(/boardId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, boardId: 'dsikl' })
    ).toThrow(/boardId/i)
  })

  it('should throw a error by incorrect userId', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, userId: 0 })
    ).toThrow(/userId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, userId: -1 })
    ).toThrow(/userId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, userId: 0.1 })
    ).toThrow(/userId/i)

    expect(() =>
      boardCollaboratorSchema.parse({ ...record, userId: 'dsikl' })
    ).toThrow(/userId/i)
  })
})

describe('boardCollaboratorInsertableSchema', () => {
  it('should parse insertable correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(boardCollaboratorInsertableSchema.parse(record)).toEqual(record)
  })
})

describe('boardCollaboratorUpdateableSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(boardCollaboratorUpdateableSchema.parse(record)).toEqual(record)
  })
})

describe('boardCollaboratorPublicSchema', () => {
  it('should parse publicSchema correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(boardCollaboratorPublicSchema.parse(record)).toEqual(record)
  })
})

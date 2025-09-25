import { omit } from 'lodash-es'
import {
  boardCollaboratorSchema,
  boardCollaboratorInsertableSchema,
  changeBoardCollaboratorSchema,
  publicBoardCollaboratorSchema,
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

describe('changeBoardCollaboratorSchema', () => {
  it('should parse insertable correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(changeBoardCollaboratorSchema.parse(record)).toEqual(record)
  })
})

describe('publicBoardCollaboratorSchema', () => {
  it('should parse insertable correctly', async () => {
    const record = { ...fakeBoardCollaborator() }

    expect(publicBoardCollaboratorSchema.parse(record)).toEqual(record)
  })
})

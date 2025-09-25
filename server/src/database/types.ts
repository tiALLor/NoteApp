import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface BoardCollaborator {
  boardId: number
  userId: number
}

export interface Note {
  boardId: Generated<number>
  content: Generated<string>
  contentEmbedding: string
  createdAt: Generated<Timestamp>
  id: Generated<number>
  isDone: Generated<boolean>
}

export interface NoteBoard {
  createdAt: Generated<Timestamp>
  id: Generated<number>
  ownerId: number
  title: Generated<string>
}

export interface User {
  createdAt: Generated<Timestamp>
  email: string
  id: Generated<number>
  lastLogin: Timestamp | null
  passwordHash: string
  updatedAt: Generated<Timestamp>
  userName: string
}

export interface DB {
  boardCollaborator: BoardCollaborator
  note: Note
  noteBoard: NoteBoard
  user: User
}

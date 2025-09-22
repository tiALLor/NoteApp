import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

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
  user: User
}

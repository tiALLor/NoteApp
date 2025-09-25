import { z } from 'zod'
import { type NoteBoard } from '@server/database/types'
import { idSchema, dateTimeSchema } from './shared'

// ===========================================
// main schema
// ===========================================
export const noteBoardSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  ownerId: idSchema,
  createdAt: dateTimeSchema.optional(),
})

export const noteBoardAllKeys = Object.keys(
  noteBoardSchema.shape
) as (keyof NoteBoard)[]

// ===========================================
// insertable
// ===========================================
export const noteBoardInsertableSchema = noteBoardSchema.pick({
  title: true,
  ownerId: true,
})

export type NoteBoardInsertable = z.infer<typeof noteBoardInsertableSchema>

// ===========================================
// updateable
// ===========================================
export const changeNoteBoardSchema = noteBoardSchema.pick({
  title: true,
})

export type ChangeNoteSchema = z.infer<typeof changeNoteBoardSchema>

// ===========================================
// selectable
// ===========================================
export const publicNoteBoardSchema = noteBoardSchema

export type PublicNoteBoard = z.infer<typeof publicNoteBoardSchema>

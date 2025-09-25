import { z } from 'zod'
import type { Note } from '@server/database/types'
import { idSchema, dateTimeSchema } from './shared'

// TODO: change to import from Embeddings service
// cohere embedding service
const vectorSize = 1536

// ===========================================
// main schema
// ===========================================
export const noteSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  content: z.string().trim().min(1),
  contentEmbedding: z.array(z.number()).length(vectorSize),
  createdAt: dateTimeSchema.optional(),
  isDone: z.boolean().default(false),
})

export const userKeyAll = Object.keys(noteSchema.shape) as (keyof Note)[]

// ===========================================
// insertable
// ===========================================
export const noteInsertableSchema = noteSchema.pick({
  boardId: true,
  content: true,
  contentEmbedding: true,
})

export type NoteInsertable = z.infer<typeof noteInsertableSchema>

// ===========================================
// updateable
// ===========================================

export const changeNoteSchema = noteInsertableSchema.pick({
  content: true,
  contentEmbedding: true,
})

export type ChangeNote = z.infer<typeof changeNoteSchema>

export const changeIsDoneNoteSchema = noteSchema.pick({
  isDone: true,
})

export type ChangeIsDoneNote = z.infer<typeof changeIsDoneNoteSchema>

// ===========================================
// selectable
// ===========================================
export const publicNoteSchema = noteSchema.omit({ contentEmbedding: true })

export type PublicNote = z.infer<typeof publicNoteSchema>

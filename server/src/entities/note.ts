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
  contentEmbedding: z.array(z.number()).length(vectorSize).optional(),
  createdAt: dateTimeSchema.optional(),
  isDone: z.boolean().default(false),
})

export const noteKeyAll = Object.keys(noteSchema.shape) as (keyof Note)[]

// ===========================================
// insertable
// ===========================================
export const noteInsertableSchema = noteSchema.pick({
  boardId: true,
  content: true,
  contentEmbedding: true,
  createdAt: true,
})

export type NoteInsertable = z.infer<typeof noteInsertableSchema>

// ===========================================
// updateable
// ===========================================

export const noteUpdateableSchema = noteSchema.pick({
  id: true,
  content: true,
})

export type NoteUpdateable = z.infer<typeof noteUpdateableSchema>

export const noteEmbUpdateableSchema = z.object({
  id: idSchema,
  contentEmbedding: z.array(z.number()).length(vectorSize),
})

export type NoteEmbUpdateable = z.infer<typeof noteEmbUpdateableSchema>

export const NoteIsDoneUpdateableSchema = noteSchema.pick({
  id: true,
  isDone: true,
})

export type ChangeIsDoneNote = z.infer<typeof NoteIsDoneUpdateableSchema>

// ===========================================
// selectable
// ===========================================
export const notePublicSchema = noteSchema.omit({ contentEmbedding: true })

export type NotePublic = z.infer<typeof notePublicSchema>

export const noteKeyPublic = Object.keys(
  notePublicSchema.shape
) as (keyof NotePublic)[]

// ===========================================
// semantic search in notes
// ===========================================

export const noteSemanticSearchSchema = z.object({
  query: z.string().trim().min(1),
})

export type NoteSemanticSearch = z.infer<typeof noteSemanticSearchSchema>

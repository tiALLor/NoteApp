import { z } from 'zod'
import { type NoteBoard } from '@server/database/types'
import { idSchema, dateTimeSchema } from './shared'

// ===========================================
// main schema
// ===========================================
export const noteBoardSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).default('general'),
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
  createdAt: true,
})

export type NoteBoardInsertable = z.infer<typeof noteBoardInsertableSchema>

// ===========================================
// updateable
// ===========================================
export const noteBoardUpdateableSchema = noteBoardSchema.pick({
  id: true,
  title: true,
})

export type NoteBoardUpdateable = z.infer<typeof noteBoardUpdateableSchema>

// ===========================================
// selectable
// ===========================================
export const noteBoardPublicSchema = noteBoardSchema

export type NoteBoardPublic = z.infer<typeof noteBoardPublicSchema>

export const noteBoardKeyPublic = Object.keys(
  noteBoardPublicSchema.shape
) as (keyof NoteBoardPublic)[]

export const noteBoardPublicWithUserSchema = noteBoardSchema.extend({
  ownerUserName: z.string().trim().min(1).max(100),
})
export type NoteBoardPublicWithUser = z.infer<
  typeof noteBoardPublicWithUserSchema
>

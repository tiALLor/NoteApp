import { z } from 'zod'
import type { BoardCollaborator } from '@server/database/types'
import { idSchema } from './shared'

// ===========================================
// main schema
// ===========================================
export const boardCollaboratorSchema = z.object({
  boardId: idSchema,
  userId: idSchema,
})

export const boardCollaboratorKeyAll = Object.keys(
  boardCollaboratorSchema.shape
) as (keyof BoardCollaborator)[]

// ===========================================
// insertable
// ===========================================
export const boardCollaboratorInsertableSchema = boardCollaboratorSchema

export type BoardCollaboratorInsertable = z.infer<
  typeof boardCollaboratorInsertableSchema
>

// ===========================================
// updateable for delate
// ===========================================
export const boardCollaboratorUpdateableSchema = boardCollaboratorSchema

export type BoardCollaboratorUpdateable = z.infer<
  typeof boardCollaboratorUpdateableSchema
>

// ===========================================
// selectable
// ===========================================
export const boardCollaboratorPublicSchema = boardCollaboratorSchema

export type BoardCollaboratorPublic = z.infer<
  typeof boardCollaboratorPublicSchema
>

export const boardCollaboratorKeyPublic = Object.keys(
  boardCollaboratorPublicSchema.shape
) as (keyof BoardCollaboratorPublic)[]

export const BoardCollaboratorPublicWithUserSchema =
  boardCollaboratorPublicSchema.extend({
    collaboratorUserName: z.string().trim().min(1).max(100),
  })

export type BoardCollaboratorPublicWithUser = z.infer<
  typeof BoardCollaboratorPublicWithUserSchema
>

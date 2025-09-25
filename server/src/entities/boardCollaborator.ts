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
export const changeBoardCollaboratorSchema = boardCollaboratorSchema

export type ChangeBoardCollaborator = z.infer<
  typeof changeBoardCollaboratorSchema
>

// ===========================================
// selectable
// ===========================================
export const publicBoardCollaboratorSchema = boardCollaboratorSchema

export type PublicBoardCollaborator = z.infer<
  typeof publicBoardCollaboratorSchema
>

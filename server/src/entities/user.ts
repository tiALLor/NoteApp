import { z } from 'zod'
import type { Insertable, Selectable } from 'kysely'
import type { User } from '@server/database/types'
import { idSchema, dateSchema, dateTimeSchema, passwordSchema } from './shared'

// ===========================================
// main schema
// ===========================================
export const userSchema = z.object({
  id: idSchema,
  userName: z.string().trim().min(1).max(100),
  // email: z.string().toLowerCase().trim().email(),
  email: z.string().toLowerCase().trim().max(255).email(),
  password: passwordSchema,
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
  lastLogin: dateTimeSchema.optional().nullable(),
})

export const userKeyAll = Object.keys(userSchema.shape) as (keyof User)[]

export const userWithHashSchema = z.object({
  id: idSchema,
  userName: z.string().trim().min(1).max(100),
  // email: z.string().toLowerCase().trim().email(),
  email: z.string().toLowerCase().trim().max(255).email(),
  passwordHash: passwordSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
  lastLogin: dateTimeSchema.optional().nullable(),
})

export const userWithHashKeyAll = Object.keys(
  userWithHashSchema.shape
) as (keyof User)[]

// ===========================================
// insertable
// ===========================================
export const userInsertableSchema = userSchema
  .pick({ userName: true, email: true, password: true })
  .extend({ id: userSchema.shape.id.optional() })

export type UserInsertable = z.infer<typeof userInsertableSchema>

export const userWithHashInsertable = userWithHashSchema.pick({
  userName: true,
  email: true,
  passwordHash: true,
})

export type UserWithHashInsertable = Insertable<User>

// ===========================================
// updateable
// ===========================================
export const changePasswordSchema = z
  .object({
    oldPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        path: ['confirmNewPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
      })
    }

    if (data.newPassword === data.oldPassword) {
      ctx.addIssue({
        path: ['newPassword'],
        code: z.ZodIssueCode.custom,
        message: 'New password cannot match old password',
      })
    }
  })

// ===========================================
// selectable
// ===========================================
export type UserWithHashSelectable = Selectable<User>

// ===========================================
// public
// ===========================================
export const userPublicSchema = userSchema.pick({
  id: true,
  userName: true,
})

export const userKeyPublic = ['id', 'userName'] as const

export type UserPublic = Pick<Selectable<User>, (typeof userKeyPublic)[number]>

// ===========================================
// loginSchema
// ===========================================

export const loginSchema = z.object({
  email: z.string().toLowerCase().trim().email(),
  password: z.string().trim().min(1),
})

export type LoginData = z.infer<typeof loginSchema>

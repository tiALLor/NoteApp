import { z } from 'zod'
import type { Insertable, Selectable } from 'kysely'
import type { User } from '@server/database/types'
import { ROLES } from './role'
import { idSchema } from './shared'

// main schema
export const userSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(50),
  email: z.string().toLowerCase().trim().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(64, 'Password must be at most 64 characters long'),
  roleId: z.number().positive().max(ROLES.length),
})

export const userKeyAll = Object.keys(userSchema.shape) as (keyof User)[]

// insertable
export const userInsertable = userSchema.pick({
  name: true,
  email: true,
  password: true,
  roleId: true,
})

export type UserInsertable = Insertable<User>

// updateable

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(8).max(64),
    newPassword: z.string().min(8).max(64),
    confirmNewPassword: z.string().min(8).max(64),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Passwords do not match',
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// public

export const userKeyPublic = ['id', 'name'] as const

export type UserPublic = Pick<Selectable<User>, (typeof userKeyPublic)[number]>

// user with Role name
export const userSchemaWithRoleName = userSchema.extend({
  roleName: z.enum(ROLES),
})

export type UserWithRoleName = z.infer<typeof userSchemaWithRoleName>

// authUser

export const authUserSchemaWithRoleName = userSchemaWithRoleName.pick({
  id: true,
  name: true,
  roleName: true,
})

export type AuthUserWithRoleName = z.infer<typeof authUserSchemaWithRoleName>

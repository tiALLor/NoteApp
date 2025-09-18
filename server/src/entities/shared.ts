import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()
export const dateSchema = z.coerce.date()

import { z } from 'zod'

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?~]).{8,}$/

const passwordRegexLowercase = /(?=.*[a-z])/
const passwordRegexUppercase = /(?=.*[A-Z])/
const passwordRegexDigit = /(?=.*\d)/
const passwordRegexSpecial = /(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?~])/

export const idSchema = z.coerce.number().int().positive()
export const dateSchema = z.coerce.date()
export const dateTimeSchema = z.string().datetime()
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(64, 'Password must be at most 64 characters long')
  .regex(passwordRegex, 'Passwords min requirements not meet: ')
  .regex(
    passwordRegexLowercase,
    'password must contain at least one lowercase character '
  )
  .regex(passwordRegexUppercase, 'password must contain at least one digit ')
  .regex(passwordRegexDigit, ' password must contain at least one digit ')
  .regex(
    passwordRegexSpecial,
    ' password must contain at least one special character (!@#$%^&*()_+{}[]:;<>,.?~-) '
  )

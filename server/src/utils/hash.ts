// TODO: delete file
import { hash } from 'bcrypt'
import config from '@server/config'

const addPepper = (password: string) =>
  `${password}${config.auth.passwordPepper}`

export async function getPasswordHash(password: string) {
  const passwordHash = await hash(addPepper(password), config.auth.passwordCost)

  return passwordHash
}

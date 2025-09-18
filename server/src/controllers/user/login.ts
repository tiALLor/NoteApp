import bcrypt from 'bcrypt'
import config from '@server/config'
import jsonwebtoken from 'jsonwebtoken'
import type { SignOptions, Secret } from 'jsonwebtoken'
import { publicProcedure } from '@server/trpc'
import { TRPCError } from '@trpc/server'
import { userSchema } from '@server/entities/user'
import provideRepos from '@server/trpc/provideRepos'
import { userRepository } from '@server/repositories/userRepository'
import { prepareTokenPayload } from '@server/trpc/tokenPayload'

const addPepper = (password: string) =>
  `${password}${config.auth.passwordPepper}`

const { expiresIn, tokenKey } = config.auth

export default publicProcedure
  .use(provideRepos({ userRepository }))
  .input(
    userSchema.pick({
      email: true,
      password: true,
    })
  )
  .mutation(async ({ input: { email, password }, ctx: { repos } }) => {
    const user = await repos.userRepository.getByEmailWithRoleName(email)

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'We could not find an account with this email address',
      })
    }

    const isPassMatch = await bcrypt.compare(addPepper(password), user.password)

    if (!isPassMatch) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Incorrect password. Please try again.',
      })
    }

    const payload = prepareTokenPayload(user)

    const options: SignOptions = {
      expiresIn: expiresIn as SignOptions['expiresIn'],
    }

    const accessToken = jsonwebtoken.sign(payload, tokenKey as Secret, options)

    return {
      accessToken,
    }
  })

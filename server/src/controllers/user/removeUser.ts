import { userSchema } from '@server/entities/user'
import { userRepository } from '@server/repositories/userRepository'
import { authenticatedProcedure } from '@server/trpc/authenticatedProcedure'
import provideRepos from '@server/trpc/provideRepos'
import bcrypt from 'bcrypt'
import config from '@server/config'
import { TRPCError } from '@trpc/server'

const addPepper = (password: string) =>
  `${password}${config.auth.passwordPepper}`

export default authenticatedProcedure
  .use(provideRepos({ userRepository }))
  .input(
    userSchema.pick({
      password: true,
    })
  )
  .mutation(async ({ input: { password }, ctx: { authUser, repos } }) => {
    const user = await repos.userRepository.getByIdWithRoleName(authUser.id)

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'We could not find user with user.id',
      })
    }

    const isPassMatch = await bcrypt.compare(addPepper(password), user.password)

    if (!isPassMatch) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Incorrect old password. Please try again.',
      })
    }

    const deletedUser = await repos.userRepository.deleteUserById(authUser.id)

    if (!deletedUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'could not find user with user.id',
      })
    }

    return {
      id: deletedUser.id,
    }
  })

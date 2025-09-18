import { changePasswordSchema } from '@server/entities/user'
import { userRepository } from '@server/repositories/userRepository'
import { authenticatedProcedure } from '@server/trpc/authenticatedProcedure'
import provideRepos from '@server/trpc/provideRepos'
import bcrypt, { hash } from 'bcrypt'
import config from '@server/config'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'

const addPepper = (password: string) =>
  `${password}${config.auth.passwordPepper}`

export default authenticatedProcedure
  .use(provideRepos({ userRepository }))
  .input(changePasswordSchema)
  .mutation(
    async ({
      input: { oldPassword, newPassword },
      ctx: { authUser, repos },
    }) => {
      const user = await repos.userRepository.getByIdWithRoleName(authUser.id)

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'could not find user with user.id',
        })
      }

      const isPassMatch = await bcrypt.compare(
        addPepper(oldPassword),
        user.password
      )

      if (!isPassMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect old password. Please try again.',
        })
      }

      const newPasswordHash = await hash(
        addPepper(newPassword),
        config.auth.passwordCost
      )

      const changedUser = await repos.userRepository
        .updatePassword({
          id: authUser.id,
          password: newPasswordHash,
        })
        .catch((error: unknown) => {
          assertError(error)

          throw error
        })

      return {
        id: changedUser.id,
        name: changedUser.name,
      }
    }
  )

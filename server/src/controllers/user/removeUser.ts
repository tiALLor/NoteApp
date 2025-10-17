import { loginSchema, type UserPublic } from '@server/entities/user'
import { authenticatedProcedure } from '@server/trpc/authenticatedProcedure'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'

export default authenticatedProcedure
  .input(
    loginSchema.pick({
      password: true,
    })
  )
  .mutation(
    async ({
      input: { password },
      ctx: { authUser, authService },
    }): Promise<UserPublic> => {
      let deletedUser: UserPublic

      try {
        deletedUser = await authService.removeUser(authUser.id, password)
      } catch (error) {
        assertError(error)
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User delete failed',
          cause: error,
        })
      }

      return deletedUser
    }
  )

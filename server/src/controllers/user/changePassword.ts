import { changePasswordSchema, type UserPublic } from '@server/entities/user'
import { authenticatedProcedure } from '@server/trpc/authenticatedProcedure'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'

export default authenticatedProcedure
  .input(changePasswordSchema)
  .mutation(
    async ({
      input: { oldPassword, newPassword },
      ctx: { authUser, authService },
    }) => {
      if (oldPassword === newPassword) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Old and New Password do not match',
        })
      }

      let changedUser: UserPublic

      if (!authService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Auth service not available',
        })
      }

      try {
        changedUser = await authService.changePassword(
          authUser.id,
          oldPassword,
          newPassword
        )
      } catch (error) {
        assertError(error)
        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Password reset failed',
          cause: error,
        })
      }

      return {
        id: changedUser.id,
        userName: changedUser.userName,
      }
    }
  )

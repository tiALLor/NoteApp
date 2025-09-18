import { userSchemaWithRoleName, type UserPublic } from '@server/entities/user'
import { userRepository } from '@server/repositories/userRepository'
import { roleRepository } from '@server/repositories/roleRepository'
import { adminAuthProcedure } from '@server/trpc/adminAuthProcedure'
import provideRepos from '@server/trpc/provideRepos'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'
import { getPasswordHash } from '@server/utils/hash'

export default adminAuthProcedure
  .use(provideRepos({ userRepository, roleRepository }))
  .input(
    userSchemaWithRoleName.pick({
      email: true,
      password: true,
      name: true,
      roleName: true,
    })
  )
  .mutation(async ({ input: user, ctx: { repos } }): Promise<UserPublic> => {
    const passwordHash = await getPasswordHash(user.password)

    const roleId = await repos.roleRepository.getRoleIdByName(user.roleName)

    if (!roleId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Incorrect roleName. Please try again.',
      })
    }

    const userCreated = await repos.userRepository
      .create({
        email: user.email,
        name: user.name,
        password: passwordHash,
        roleId: roleId.id,
      })
      .catch((error: unknown) => {
        assertError(error)

        // wrapping an ugly error into a user-friendly one
        if (error.message.includes('duplicate key')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User with this email already exists',
            cause: error,
          })
        }

        throw error
      })
    return {
      id: userCreated.id,
      name: userCreated.name,
    }
  })

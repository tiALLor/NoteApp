import { userSchema } from '@server/entities/user'
import { userRepository } from '@server/repositories/userRepository'
import { publicProcedure } from '@server/trpc'
import provideRepos from '@server/trpc/provideRepos'
import { TRPCError } from '@trpc/server'
import { assertError } from '@server/utils/errors'
import { getPasswordHash } from '@server/utils/hash'

// remove roleId from input and adjust the tests
export default publicProcedure
  .use(provideRepos({ userRepository }))
  .input(
    userSchema.pick({
      email: true,
      password: true,
      name: true,
    })
  )
  .mutation(async ({ input: user, ctx: { repos } }) => {
    const passwordHash = await getPasswordHash(user.password)

    const userCreated = await repos.userRepository
      .create({
        ...user,
        password: passwordHash,
        roleId: 3,
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

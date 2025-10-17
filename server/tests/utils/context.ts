import { fakeAuthUser } from '@server/entities/tests/fakes'
import { userPublicSchema, type UserPublic } from '@server/entities/user'
import { AuthService } from '@server/services/authService'
import type { Context, ContextMinimal } from '@server/trpc'

export const requestContext = (
  context: Partial<Context> & ContextMinimal
): Context => ({
  req: {
    headers: () => undefined,
    get: () => undefined,
  } as any,
  res: {
    cookie: () => undefined,
  } as any,
  ...context,
})

export const authContext = (
  context: Partial<Context> & ContextMinimal,
  user: UserPublic = fakeAuthUser()
): Context => ({
  authUser: userPublicSchema.parse(user),
  ...context,
})

export const authRepoContext = (
  repos: any, // Context['repos'], but easier to work with any in tests
  user: UserPublic = fakeAuthUser()
): Context => ({
  authUser: userPublicSchema.parse(user),
  ...requestContext({
    db: {} as any,
    repos,
    authService: {} as AuthService
  }),
})

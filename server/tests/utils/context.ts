import { fakeAuthUserWithRoleName } from '@server/entities/tests/fakes'
import {
  authUserSchemaWithRoleName,
  type AuthUserWithRoleName,
} from '@server/entities/user'
import type { Context, ContextMinimal } from '@server/trpc'

export const requestContext = (
  context: Partial<Context> & ContextMinimal
): Context => ({
  req: {
    header: () => undefined,
    get: () => undefined,
  } as any,
  res: {
    cookie: () => undefined,
  } as any,
  ...context,
})

export const authContext = (
  context: Partial<Context> & ContextMinimal,
  user: AuthUserWithRoleName = fakeAuthUserWithRoleName()
): Context => ({
  authUser: authUserSchemaWithRoleName.parse(user),
  ...context,
})

export const authRepoContext = (
  repos: any, // Context['repos'], but easier to work with any in tests
  user: AuthUserWithRoleName = fakeAuthUserWithRoleName()
): Context => ({
  authUser: authUserSchemaWithRoleName.parse(user),
  ...requestContext({
    db: {} as any,
    repos,
  }),
})

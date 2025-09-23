import { apiOrigin, apiPath } from './config'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@server/shared/trpc'
import { fakeUser } from './fakeData'
import type { Page } from '@playwright/test'
// import testUser with admin role

let accessToken: string | null = null

function setAccessToken(token: string | null) {
  accessToken = token
}

declare global {
  interface Window {
    __AUTH_STORE__: {
      storeTokenAndUser: (
        accessToken: string,
        user: { id: number; name: string; roleName: string }
      ) => void
      isLoggedIn: boolean
    }
  }
}

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiOrigin}${apiPath}`,
      // send the access token with every request
      headers: () => ({
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }),
    }),
  ],
})

// type UserCreate = Parameters<typeof trpc.user.createUser.mutate>[0]

// export async function signInUser(userData: UserCreate = fakeUser()): Promise<void> {
//   const loginResponse = await trpc.user.login.mutate(testUser)

//   setAccessToken(loginResponse.accessToken)
//   try {
//     await trpc.user.createUser.mutate(userData)
//   } catch (error) {
//     // ignore cases when user already exists
//     // console.log(error)
//   }

//   setAccessToken(null)
// }

type UserSignup = Exclude<Parameters<typeof trpc.user.signup.mutate>[0], void>
type UserLogin = Exclude<Parameters<typeof trpc.user.login.mutate>[0], void>
type UserLoginAuthed = UserLogin & {
  id: number
  userName: string
  accessToken: string
}

/**
 * Logs in a new user by signing them up and logging them in with the provided
 * user login information.
 */
export async function loginNewUser(userLogin: UserSignup = fakeUser()): Promise<UserLoginAuthed> {
  try {
    await trpc.user.signup.mutate(userLogin)
  } catch (error) {
    // ignore cases when user already exists
    // console.log(error)
  }

  const loginResponse = await trpc.user.login.mutate(userLogin)
  const userId = JSON.parse(atob(loginResponse.accessToken.split('.')[1])).user.id
  const userName = JSON.parse(atob(loginResponse.accessToken.split('.')[1])).user.name
  // const userRoleName = JSON.parse(atob(loginResponse.accessToken.split('.')[1])).user.roleName

  return {
    ...userLogin,
    id: userId,
    userName: userName,
    accessToken: loginResponse.accessToken,
  }
}

export async function asUser<T>(
  page: Page,
  userLogin: UserLogin,
  callback: (user: UserLoginAuthed) => Promise<T>
): Promise<T> {
  // running independent tasks in parallel
  const [user] = await Promise.all([
    loginNewUser({ ...userLogin, userName: 'any' }),
    (async () => {
      // if no page is open, go to the home page
      if (page.url() === 'about:blank') {
        await page.goto('/')
        await page.waitForURL('/')
      }
    })(),
  ])

  // Unfortunate that we are dealing with page internals and
  // implementation details here, but as long as we make sure that
  // this logic is in one place and it does not spill into tests,
  // we should be fine.
  await page.evaluate(
    ({ accessToken, user }) => {
      window.__AUTH_STORE__.storeTokenAndUser(accessToken, {
        id: user.id,
        userName: user.userName,
      })
    },
    { accessToken: user.accessToken, user }
  )
  const callbackResult = await callback(user)

  await page.evaluate(() => {
    localStorage.removeItem('token')
  })
  accessToken = null

  return callbackResult
}

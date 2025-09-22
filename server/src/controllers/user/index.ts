import { router } from '@server/trpc'
import login from './login'
import signup from './signup'
import changePassword from './changePassword'
import removeUser from './removeUser'
import refreshToken from './refreshToken'

export default router({
  // for users
  login,
  signup,
  changePassword,
  removeUser,
  refreshToken
})

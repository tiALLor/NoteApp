import { router } from '@server/trpc'
import login from './login'
import signup from './signup'
import changePassword from './changePassword'
import createUser from './createUser'
import removeUser from './removeUser'

export default router({
  // for users
  login,
  signup,
  changePassword,
  removeUser,
  createUser,
})

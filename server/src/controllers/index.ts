import { router } from '../trpc'
import user from './user'
import meal from './meal'
import menu from './menu'
import order from './order'

export const appRouter = router({
  user,
  meal,
  menu,
  order,
})

export type AppRouter = typeof appRouter

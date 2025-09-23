import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { authenticateUser } from './guards'
import { useUserAuthStore } from '@/stores/userAuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'Home',
          component: HomeView,
        },
        {
          path: '/login',
          name: 'Login',
          component: () => import('../views/LoginView.vue'),
        },
        {
          path: '/signup',
          name: 'Signup',
          component: () => import('../views/SignupView.vue'),
        },
      ],
    },
    // TODO: adjust routs
    // {
    //   path: '',
    //   component: MainLayout,
    //   beforeEnter: [authenticateAdmin],
    //   children: [
    //     {
    //       path: '/createUser',
    //       name: 'CreateUser',
    //       component: () => import('../views/CreateUser.vue'),
    //     },
    //   ],
    // },
    {
      path: '',
      component: MainLayout,
      beforeEnter: [authenticateUser],
      children: [
        // {
        //   path: '/orderSummary',
        //   name: 'OrderSummary',
        //   component: () => import('../views/OrderSummary.vue'),
        // },
        {
          path: '/accountSettings',
          name: 'AccountSettings',
          component: () => import('../views/AccountSettings.vue'),
        },
      ],
    },
    {
      path: '/:catchAll(.*)*',
      redirect: '/',
    },
  ],
})
router.beforeEach(async () => {
  const userAuthStore = useUserAuthStore()

  // Initialize auth if token exists but no user
  if (userAuthStore.accessToken && !userAuthStore.authUser) {
    try {
      await userAuthStore.getCurrentUser()
    } catch (error) {
      userAuthStore.logout()
    }
  }
})

export default router

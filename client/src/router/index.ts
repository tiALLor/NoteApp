import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { authenticateUser, authenticateChef, authenticateAdmin } from './guards'

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
    {
      path: '',
      component: MainLayout,
      beforeEnter: [authenticateAdmin],
      children: [
        {
          path: '/createUser',
          name: 'CreateUser',
          component: () => import('../views/CreateUser.vue'),
        },
      ],
    },
    {
      path: '',
      component: MainLayout,
      beforeEnter: [authenticateChef],
      children: [
        {
          path: '/menu',
          name: 'Menu',
          component: () => import('../views/Menu.vue'),
        },
        {
          path: '/meal',
          name: 'Meal',
          component: () => import('../views/Meal.vue'),
        },
      ],
    },
    {
      path: '',
      component: MainLayout,
      beforeEnter: [authenticateUser],
      children: [
        {
          path: '/orderSummary',
          name: 'OrderSummary',
          component: () => import('../views/OrderSummary.vue'),
        },
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

export default router

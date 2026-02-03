import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/index.vue'),
    },
    {
      path: '/docs/:pathMatch(.*)*',
      name: 'docs',
      component: () => import('./pages/docs/[...slug].vue'),
    },
    {
      path: '/builder',
      name: 'builder',
      component: () => import('./pages/builder/index.vue'),
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

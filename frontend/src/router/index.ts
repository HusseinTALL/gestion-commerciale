import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/views/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: (to) => {
            const auth = useAuthStore();
            if (auth.isCashier) return '/sales';
            if (auth.isCommercial) return '/commissions';
            return '/dashboard';
          },
        },
        {
          path: 'sales',
          name: 'sales',
          component: () => import('@/views/SalesView.vue'),
          meta: { title: 'Saisie des Ventes', roles: ['CASHIER', 'ADMIN'] },
        },
        {
          path: 'sales/summary',
          name: 'sales-summary',
          component: () => import('@/views/SalesSummaryView.vue'),
          meta: { title: 'Récapitulatif du Jour', roles: ['CASHIER', 'MANAGER', 'DIRECTOR', 'ADMIN'] },
        },
        {
          path: 'sales/import',
          name: 'sales-import',
          component: () => import('@/views/ExcelImportView.vue'),
          meta: { title: 'Import Excel', roles: ['ADMIN', 'MANAGER'] },
        },
        {
          path: 'commissions',
          name: 'commissions',
          component: () => import('@/views/CommissionDashboardView.vue'),
          meta: { title: 'Mes Commissions', roles: ['COMMERCIAL', 'MANAGER', 'DIRECTOR', 'ADMIN'] },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/ManagerDashboardView.vue'),
          meta: { title: 'Tableau de Bord', roles: ['MANAGER', 'DIRECTOR', 'ADMIN'] },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) { next(); return; }
  if (!auth.isAuthenticated) { next('/login'); return; }

  const roles = to.meta.roles as string[] | undefined;
  if (roles && !roles.includes(auth.user!.role)) {
    next(auth.isCashier ? '/sales' : auth.isCommercial ? '/commissions' : '/dashboard');
    return;
  }
  next();
});

export default router;

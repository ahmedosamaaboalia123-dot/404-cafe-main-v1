import { lazy } from 'react';

const LoginPage = lazy(() => import('@/modules/auth/login/LoginPage'));

export const authRoutes = {
  path: '/login',
  element: <LoginPage />,
};

import { Routes } from '@angular/router';
import { guestGuard } from './guards/auth.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
];

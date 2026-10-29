import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { auditRoutes } from './features/audit/audit.routes';
import { authRoutes } from './features/auth/auth.routes';
import { authGuard } from './features/auth/guards/auth.guard';
import { AuthService } from './features/auth/services/auth.service';
import { parametersRoutes } from './features/parameters/parameters.routes';
import { requestsRoutes } from './features/requests/requests.routes';
import { homePath } from './layout/navigation';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => homePath(inject(AuthService)) ?? 'values' },
      ...parametersRoutes,
      ...requestsRoutes,
      ...auditRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];

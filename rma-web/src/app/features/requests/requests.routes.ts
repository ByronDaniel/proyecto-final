import { Routes } from '@angular/router';
import { roleGuard } from '../auth/guards/role.guard';
import { PAGE_ACCESS } from '../auth/models/role';

export const requestsRoutes: Routes = [
  {
    path: 'requests',
    canActivate: [roleGuard(PAGE_ACCESS.requests)],
    loadComponent: () =>
      import('./pages/change-requests-page/change-requests-page').then((m) => m.ChangeRequestsPage),
  },
];

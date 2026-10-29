import { Routes } from '@angular/router';
import { roleGuard } from '../auth/guards/role.guard';
import { PAGE_ACCESS } from '../auth/models/role';

export const auditRoutes: Routes = [
  {
    path: 'audit',
    canActivate: [roleGuard(PAGE_ACCESS.audit)],
    loadComponent: () => import('./pages/audit-page/audit-page').then((m) => m.AuditPage),
  },
];

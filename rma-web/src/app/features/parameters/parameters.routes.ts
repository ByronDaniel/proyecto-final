import { Routes } from '@angular/router';
import { roleGuard } from '../auth/guards/role.guard';
import { PAGE_ACCESS } from '../auth/models/role';

export const parametersRoutes: Routes = [
  {
    path: 'parameters',
    canActivate: [roleGuard(PAGE_ACCESS.parameters)],
    loadComponent: () => import('./pages/parameters-page/parameters-page').then((m) => m.ParametersPage),
  },
  {
    path: 'values',
    canActivate: [roleGuard(PAGE_ACCESS.values)],
    loadComponent: () =>
      import('./pages/parameter-values-page/parameter-values-page').then((m) => m.ParameterValuesPage),
  },
];

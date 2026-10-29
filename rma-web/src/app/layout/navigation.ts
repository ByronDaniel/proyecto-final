import { PAGE_ACCESS, Role } from '../features/auth/models/role';
import { AuthService } from '../features/auth/services/auth.service';

export type NavPath = keyof typeof PAGE_ACCESS;

export interface NavItem {
  path: NavPath;
  label: string;
  roles: readonly Role[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: 'parameters', label: 'Parámetros', roles: PAGE_ACCESS.parameters },
  { path: 'requests', label: 'Solicitudes', roles: PAGE_ACCESS.requests },
  { path: 'values', label: 'Valores vigentes', roles: PAGE_ACCESS.values },
  { path: 'audit', label: 'Auditoría', roles: PAGE_ACCESS.audit },
];

/** First page the current user is allowed to open. */
export function homePath(auth: AuthService): NavPath | undefined {
  return NAV_ITEMS.find((item) => auth.hasRole(...item.roles))?.path;
}

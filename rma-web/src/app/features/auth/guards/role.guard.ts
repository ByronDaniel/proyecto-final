import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { homePath } from '../../../layout/navigation';
import { Role } from '../models/role';
import { AuthService } from '../services/auth.service';

/** Only lets users with one of the given roles through; others go to their home page. */
export function roleGuard(roles: readonly Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (auth.hasRole(...roles)) return true;
    const home = homePath(auth);
    return home ? inject(Router).createUrlTree(['/', home]) : false;
  };
}

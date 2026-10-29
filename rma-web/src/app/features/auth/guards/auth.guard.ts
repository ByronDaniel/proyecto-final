import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Only lets authenticated users through; others go to the login page. */
export const authGuard: CanActivateFn = () =>
  inject(AuthService).session() ? true : inject(Router).createUrlTree(['/login']);

/** Keeps authenticated users away from the login page. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).session() ? inject(Router).createUrlTree(['/']) : true;

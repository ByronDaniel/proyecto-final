import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../../../shared/http/api';
import { AUTH_TOKEN_URL, AuthService } from '../services/auth.service';

/**
 * Attaches the bearer token to API requests. Ends the session when the token has
 * expired before sending, or when the API answers 401.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL) || request.url === AUTH_TOKEN_URL) return next(request);

  const auth = inject(AuthService);
  if (auth.isExpired()) {
    auth.logout();
    return throwError(() => new Error('La sesión ha expirado.'));
  }

  const authorized = request.clone({
    setHeaders: { Authorization: `Bearer ${auth.session()!.token}` },
  });
  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) auth.logout();
      return throwError(() => error);
    }),
  );
};

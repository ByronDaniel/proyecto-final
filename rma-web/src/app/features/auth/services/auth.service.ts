import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../../shared/http/api';
import { Role } from '../models/role';
import { AuthResponse, Session } from '../models/session';

export const AUTH_TOKEN_URL = `${API_URL}/auth/token`;

const STORAGE_KEY = 'rma-session';
const MAX_TIMEOUT = 2147483647;

/** Holds the JWT session, persists it in session storage and clears it when the token expires. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<Session | null>(this.restore());
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly session = this.state.asReadonly();

  constructor() {
    this.scheduleExpiry();
  }

  async login(username: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResponse>(AUTH_TOKEN_URL, { username, password }),
    );
    const session: Session = {
      token: result.accessToken,
      username,
      roles: result.roles ?? [],
      expiresAt: Date.now() + result.expiresIn * 1000,
    };
    this.state.set(session);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.scheduleExpiry();
  }

  logout(): void {
    clearTimeout(this.expiryTimer);
    this.state.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  hasRole(...roles: readonly Role[]): boolean {
    return roles.some((role) => this.state()?.roles.includes(role));
  }

  isExpired(): boolean {
    const session = this.state();
    return !session || session.expiresAt <= Date.now();
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const session = this.state();
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      this.logout();
      return;
    }
    this.expiryTimer = setTimeout(() => this.scheduleExpiry(), Math.min(remaining, MAX_TIMEOUT));
  }

  private restore(): Session | null {
    try {
      const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (session?.expiresAt > Date.now()) return session;
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return null;
  }
}

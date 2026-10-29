import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type RecordData = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'rma-session';
  private expiryTimer?: ReturnType<typeof setTimeout>;
  session: { token: string; username: string; roles: string[]; expiresAt: number } | null = this.restore();

  constructor() { this.scheduleExpiry(); }

  private scheduleExpiry() {
    clearTimeout(this.expiryTimer);
    if (!this.session) return;
    const remaining = this.session.expiresAt - Date.now();
    if (remaining <= 0) { this.logout(); return; }
    this.expiryTimer = setTimeout(() => this.scheduleExpiry(), Math.min(remaining, 2147483647));
  }

  private restore() {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null');
      if (session?.expiresAt > Date.now()) return session;
      sessionStorage.removeItem(this.storageKey);
    } catch { sessionStorage.removeItem(this.storageKey); }
    return null;
  }

  async login(username: string, password: string) {
    const result = await firstValueFrom(this.http.post<RecordData>('/api/v1/auth/token', { username, password }));
    this.session = { token: result['accessToken'], username, roles: result['roles'] ?? [], expiresAt: Date.now() + result['expiresIn'] * 1000 };
    sessionStorage.setItem(this.storageKey, JSON.stringify(this.session));
    this.scheduleExpiry();
  }

  logout() { clearTimeout(this.expiryTimer); this.session = null; sessionStorage.removeItem(this.storageKey); }
  has(...roles: string[]) { return roles.some(role => this.session?.roles.includes(role)); }

  async call(method: string, path: string, body?: unknown, options: { etag?: string; key?: string; query?: Record<string, string> } = {}): Promise<HttpResponse<any>> {
    if (!this.session || this.session.expiresAt <= Date.now()) { this.logout(); throw new Error('La sesión ha expirado.'); }
    let headers = new HttpHeaders({ Authorization: `Bearer ${this.session.token}` });
    if (options.etag) headers = headers.set('If-Match', options.etag);
    if (options.key) headers = headers.set('Idempotency-Key', options.key);
    let params = new HttpParams();
    for (const [key, value] of Object.entries(options.query ?? {})) if (value) params = params.set(key, value);
    try {
      return await firstValueFrom(this.http.request(method, `/api/v1/${path}`, { body, headers, params, observe: 'response' }));
    } catch (error: any) {
      if (error.status === 401) this.logout();
      throw error;
    }
  }
}
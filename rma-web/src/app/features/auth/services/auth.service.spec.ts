import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  afterEach(() => sessionStorage.clear());

  it('clears the session automatically when the token expires', fakeAsync(() => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.login('maker', 'test-password');
    http.expectOne('/api/v1/auth/token').flush({ accessToken: 'test-token', roles: ['MAKER'], expiresIn: 1 });
    flushMicrotasks();
    expect(auth.session()?.username).toBe('maker');
    tick(1000);
    expect(auth.session()).toBeNull();
    expect(sessionStorage.getItem('rma-session')).toBeNull();
    http.verify();
  }));

  it('expires a restored session automatically', fakeAsync(() => {
    sessionStorage.setItem(
      'rma-session',
      JSON.stringify({ token: 'test-token', username: 'maker', roles: ['MAKER'], expiresAt: Date.now() + 1000 }),
    );
    const auth = TestBed.inject(AuthService);
    expect(auth.session()?.username).toBe('maker');
    tick(1000);
    expect(auth.session()).toBeNull();
    expect(sessionStorage.getItem('rma-session')).toBeNull();
  }));
});

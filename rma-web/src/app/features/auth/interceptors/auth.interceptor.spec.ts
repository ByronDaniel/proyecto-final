import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  function storeSession(expiresAt: number) {
    sessionStorage.setItem(
      'rma-session',
      JSON.stringify({ token: 'test-token', username: 'maker', roles: ['MAKER'], expiresAt }),
    );
  }

  function setUp() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    backend.verify();
    sessionStorage.clear();
  });

  it('adds the bearer token to API requests', () => {
    storeSession(Date.now() + 60000);
    setUp();
    http.get('/api/v1/parameters').subscribe();
    expect(backend.expectOne('/api/v1/parameters').request.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('does not authorize the login request', () => {
    setUp();
    http.post('/api/v1/auth/token', {}).subscribe();
    expect(backend.expectOne('/api/v1/auth/token').request.headers.has('Authorization')).toBeFalse();
  });

  it('rejects requests without a valid session', async () => {
    setUp();
    await expectAsync(firstValueFrom(http.get('/api/v1/parameters'))).toBeRejectedWithError('La sesión ha expirado.');
    backend.expectNone('/api/v1/parameters');
  });

  it('ends the session when the API answers 401', async () => {
    storeSession(Date.now() + 60000);
    setUp();
    const request = firstValueFrom(http.get('/api/v1/parameters'));
    backend.expectOne('/api/v1/parameters').flush(null, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(request).toBeRejected();
    expect(TestBed.inject(AuthService).session()).toBeNull();
  });
});

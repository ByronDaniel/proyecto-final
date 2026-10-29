import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_URL } from './shared/http/api';
import { App } from './app';
import { routes } from './app.routes';
import { authInterceptor } from './features/auth/interceptors/auth.interceptor';
import { AuthService } from './features/auth/services/auth.service';

const emptyPage = { items: [], page: { page: 0, size: 20, totalElements: 0, totalPages: 0 } };

function storeSession(roles: string[]) {
  sessionStorage.setItem(
    'rma-session',
    JSON.stringify({ token: 'test-token', username: 'maker', roles, expiresAt: Date.now() + 60000 }),
  );
}

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => sessionStorage.clear());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the login page when there is no session', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Rule Manager');
  });

  it('opens the first page allowed for the user roles', async () => {
    storeSession(['CONSUMER']);
    await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/values');
    TestBed.inject(HttpTestingController).expectOne((request) => request.url === `${API_URL}/parameter-values`).flush(emptyPage);
  });

  it('redirects pages the user is not allowed to open', async () => {
    storeSession(['CONSUMER']);
    await RouterTestingHarness.create('/audit');
    expect(TestBed.inject(Router).url).toBe('/values');
  });

  it('returns to the login page when the session ends', async () => {
    storeSession(['MAKER']);
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/parameters');
    TestBed.inject(HttpTestingController).expectOne((request) => request.url === `${API_URL}/parameters`).flush(emptyPage);

    TestBed.inject(AuthService).logout();
    harness.detectChanges();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});

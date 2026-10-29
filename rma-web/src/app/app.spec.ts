import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { Api } from './api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Rule Manager');
  });

  it('submits boolean values and the last published base version', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.api.session = { token: 'test-token', username: 'maker', roles: ['MAKER'], expiresAt: Date.now() + 60000 };
    const call = spyOn(app.api, 'call').and.resolveTo(new HttpResponse({ body: { items: [], page: { totalElements: 0, totalPages: 0 } } }));
    app.tab = 'parameters';
    app.detail = { id: 'parameter-id', dataType: 'BOOLEAN', currentVersionNumber: null };
    app.begin('request');
    app.form['proposedValue'] = 'false';
    app.form['baseVersionNumber'] = 3;
    app.form['reason'] = 'Change the setting';
    const key = app.pendingKey;

    await app.submit();

    expect(call).toHaveBeenCalledWith('POST', 'change-requests', { parameterId: 'parameter-id', changeType: 'SET_VALUE', reason: 'Change the setting', baseVersionNumber: 3, proposedValue: false }, { key });
  });

  it('clears the session automatically when the token expires', fakeAsync(() => {
    const api = TestBed.inject(Api);
    const http = TestBed.inject(HttpTestingController);
    api.login('maker', 'test-password');
    http.expectOne('/api/v1/auth/token').flush({ accessToken: 'test-token', roles: ['MAKER'], expiresIn: 1 });
    flushMicrotasks();
    expect(api.session?.username).toBe('maker');
    tick(1000);
    expect(api.session).toBeNull();
    expect(sessionStorage.getItem('rma-session')).toBeNull();
    http.verify();
  }));

  it('expires a restored session automatically', fakeAsync(() => {
    sessionStorage.setItem('rma-session', JSON.stringify({ token: 'test-token', username: 'maker', roles: ['MAKER'], expiresAt: Date.now() + 1000 }));
    const api = TestBed.inject(Api);
    expect(api.session?.username).toBe('maker');
    tick(1000);
    expect(api.session).toBeNull();
    expect(sessionStorage.getItem('rma-session')).toBeNull();
  }));

  it('clears the previous user view on login and logout', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    spyOn(app.api, 'login').and.callFake(async () => { app.api.session = { token: 'test-token', username: 'maker', roles: ['MAKER'], expiresAt: Date.now() + 60000 }; });
    spyOn(app.api, 'call').and.resolveTo(new HttpResponse({ body: { items: [], page: { totalElements: 0, totalPages: 0 } } }));
    app.modal = 'request'; app.form = { proposedValue: 'old value' }; app.notice = 'old notice'; app.detail = { id: 'old' };
    await app.login();
    expect(app.modal).toBe('');
    expect(app.form).toEqual({});
    expect(app.notice).toBe('');
    expect(app.detail).toBeNull();
    app.modal = 'edit'; app.form = { name: 'old name' }; app.error = 'old error';
    app.logout();
    expect(app.modal).toBe('');
    expect(app.form).toEqual({});
    expect(app.error).toBe('');
  });
});

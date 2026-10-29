import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { emptyParameterForm } from '../models/parameter-form';
import { ParametersService } from './parameters.service';

describe('ParametersService', () => {
  let service: ParametersService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ParametersService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('creates parameters omitting empty fields and grouping scope and constraints', () => {
    const form = {
      ...emptyParameterForm(),
      code: 'TRANSFER_DAILY_LIMIT',
      name: 'Daily limit',
      dataType: 'MONEY' as const,
      category: 'LIMITS',
      businessDomain: 'PAYMENTS',
      channel: 'MOBILE',
      min: 0,
      allowedValues: 'A, B,',
    };

    service.create(form, 'key-1');

    expect(backend.expectOne('/api/v1/parameters').request.body).toEqual({
      code: 'TRANSFER_DAILY_LIMIT',
      dataType: 'MONEY',
      name: 'Daily limit',
      category: 'LIMITS',
      businessDomain: 'PAYMENTS',
      scope: { channel: 'MOBILE' },
      constraints: { min: 0, allowedValues: ['A', 'B'] },
    });
  });

  it('updates only the editable metadata with the ETag', () => {
    const form = { ...emptyParameterForm(), code: 'IGNORED', channel: 'IGNORED', name: 'Daily limit', category: 'LIMITS', businessDomain: 'PAYMENTS' };

    service.update('parameter-id', form, '"v1"', 'key-1');

    const request = backend.expectOne('/api/v1/parameters/parameter-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"v1"');
    expect(request.request.body).toEqual({ name: 'Daily limit', category: 'LIMITS', businessDomain: 'PAYMENTS' });
  });
});

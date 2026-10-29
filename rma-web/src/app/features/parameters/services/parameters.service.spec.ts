import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../shared/http/api';
import { Parameter } from '../models/parameter';
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

  it('creates parameters with unit and scope but without constraints', () => {
    const form = {
      ...emptyParameterForm(),
      code: 'TRANSFER_DAILY_LIMIT',
      name: 'Daily limit',
      dataType: 'MONEY' as const,
      category: 'LIMITS',
      businessDomain: 'PAYMENTS',
      channel: 'MOBILE',
      unit: 'USD',
      min: 0,
      allowedValues: 'A, B,',
    };

    service.create(form, 'key-1');

    expect(backend.expectOne(`${API_URL}/parameters`).request.body).toEqual({
      code: 'TRANSFER_DAILY_LIMIT',
      dataType: 'MONEY',
      name: 'Daily limit',
      category: 'LIMITS',
      businessDomain: 'PAYMENTS',
      unit: 'USD',
      scope: { channel: 'MOBILE' },
    });
  });

  it('updates unit and constraints when editing', () => {
    const form = { ...emptyParameterForm(), name: 'Daily limit', category: 'LIMITS', businessDomain: 'PAYMENTS', unit: 'USD', min: 0, allowedValues: 'A, B,' };

    service.update('parameter-id', form, '"v1"', 'key-1');

    expect(backend.expectOne(`${API_URL}/parameters/parameter-id`).request.body).toEqual({
      name: 'Daily limit',
      category: 'LIMITS',
      businessDomain: 'PAYMENTS',
      unit: 'USD',
      constraints: { min: 0, allowedValues: ['A', 'B'] },
    });
  });

  it('fetches every page of the version history in order', async () => {
    const url = `${API_URL}/parameters/parameter-id/versions`;
    const history = service.versions('parameter-id');

    const first = backend.expectOne((request) => request.url === url && request.params.get('page') === '0');
    expect(first.request.params.get('size')).toBe('100');
    first.flush({ items: [{ versionNumber: 1 }], page: { page: 0, size: 100, totalElements: 101, totalPages: 2 } });
    await Promise.resolve();
    backend
      .expectOne((request) => request.url === url && request.params.get('page') === '1')
      .flush({ items: [{ versionNumber: 2 }], page: { page: 1, size: 100, totalElements: 101, totalPages: 2 } });

    expect((await history).map((version) => version.versionNumber)).toEqual([1, 2]);
  });

  describe('baseVersionNumber', () => {
    const parameter = { id: 'parameter-id' } as Parameter;
    const url = `${API_URL}/parameters/parameter-id/versions`;

    it('uses the current version without calling the API', async () => {
      expect(await service.baseVersionNumber({ ...parameter, currentVersionNumber: 4 })).toBe(4);
    });

    it('falls back to the latest published version', async () => {
      const base = service.baseVersionNumber({ ...parameter, currentVersionNumber: null });
      const request = backend.expectOne((r) => r.url === url);
      expect(request.request.params.get('size')).toBe('1');
      request.flush({ items: [{ versionNumber: 7 }], page: { page: 0, size: 1, totalElements: 7, totalPages: 7 } });
      expect(await base).toBe(7);
    });

    it('is null when nothing was published', async () => {
      const base = service.baseVersionNumber({ ...parameter, currentVersionNumber: null });
      backend.expectOne((r) => r.url === url).flush({ items: [], page: { page: 0, size: 1, totalElements: 0, totalPages: 0 } });
      expect(await base).toBeNull();
    });
  });

  it('updates only the editable metadata with the ETag', () => {
    const form = { ...emptyParameterForm(), code: 'IGNORED', channel: 'IGNORED', name: 'Daily limit', category: 'LIMITS', businessDomain: 'PAYMENTS' };

    service.update('parameter-id', form, '"v1"', 'key-1');

    const request = backend.expectOne(`${API_URL}/parameters/parameter-id`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"v1"');
    expect(request.request.body).toEqual({ name: 'Daily limit', category: 'LIMITS', businessDomain: 'PAYMENTS' });
  });
});

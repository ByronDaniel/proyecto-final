import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../../shared/http/api';
import { emptyChangeRequestForm } from '../models/change-request-form';
import { ChangeRequestsService } from './change-requests.service';

describe('ChangeRequestsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  it('submits boolean values and the last published base version', () => {
    const service = TestBed.inject(ChangeRequestsService);
    const backend = TestBed.inject(HttpTestingController);
    const form = { ...emptyChangeRequestForm(), proposedValue: 'false', baseVersionNumber: 3, reason: 'Change the setting' };

    service.create({ id: 'parameter-id', dataType: 'BOOLEAN', currentVersionNumber: null }, form, 'key-1');

    const request = backend.expectOne(`${API_URL}/change-requests`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('key-1');
    expect(request.request.body).toEqual({
      parameterId: 'parameter-id',
      changeType: 'SET_VALUE',
      reason: 'Change the setting',
      baseVersionNumber: 3,
      proposedValue: false,
    });
    backend.verify();
  });
});

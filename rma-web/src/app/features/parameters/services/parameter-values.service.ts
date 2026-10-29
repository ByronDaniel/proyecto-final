import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, PAGE_SIZE, queryParams } from '../../../shared/http/api';
import { CurrentValue, CurrentValuePage, ParameterValueFilter } from '../models/parameter-value';

const PARAMETER_VALUES_URL = `${API_URL}/parameter-values`;

/** Read-only access to the values currently in force, for consumers. */
@Injectable({ providedIn: 'root' })
export class ParameterValuesService {
  private readonly http = inject(HttpClient);

  list({ page, codes }: ParameterValueFilter): Promise<CurrentValuePage> {
    const params = queryParams({ page, size: PAGE_SIZE, codes: codes.toUpperCase() });
    return firstValueFrom(this.http.get<CurrentValuePage>(PARAMETER_VALUES_URL, { params }));
  }

  get(code: string): Promise<CurrentValue> {
    return firstValueFrom(this.http.get<CurrentValue>(`${PARAMETER_VALUES_URL}/${code}`));
  }
}

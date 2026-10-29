import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, PAGE_SIZE, WithEtag, queryParams, withEtag, writeHeaders } from '../../../shared/http/api';
import { Page } from '../../../shared/models/page';
import { Parameter, ParameterConstraints, ParameterFilter, Scope } from '../models/parameter';
import { ParameterFormValue } from '../models/parameter-form';

const PARAMETERS_URL = `${API_URL}/parameters`;

@Injectable({ providedIn: 'root' })
export class ParametersService {
  private readonly http = inject(HttpClient);

  list({ page, code }: ParameterFilter): Promise<Page<Parameter>> {
    const params = queryParams({ page, size: PAGE_SIZE, code: code.toUpperCase() });
    return firstValueFrom(this.http.get<Page<Parameter>>(PARAMETERS_URL, { params }));
  }

  async get(id: string): Promise<WithEtag<Parameter>> {
    return withEtag(
      await firstValueFrom(this.http.get<Parameter>(`${PARAMETERS_URL}/${id}`, { observe: 'response' })),
    );
  }

  create(form: ParameterFormValue, idempotencyKey: string): Promise<Parameter> {
    const body: Record<string, unknown> = {
      ...withoutEmpty({ code: form.code, dataType: form.dataType }),
      ...metadataBody(form),
    };
    const scope = scopeBody(form);
    if (scope) body['scope'] = scope;
    return firstValueFrom(
      this.http.post<Parameter>(PARAMETERS_URL, body, { headers: writeHeaders({ idempotencyKey }) }),
    );
  }

  update(id: string, form: ParameterFormValue, etag: string, idempotencyKey: string): Promise<Parameter> {
    return firstValueFrom(
      this.http.put<Parameter>(`${PARAMETERS_URL}/${id}`, metadataBody(form), {
        headers: writeHeaders({ etag, idempotencyKey }),
      }),
    );
  }

  /** Retires a draft parameter (logical delete). */
  retire(id: string, etag: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${PARAMETERS_URL}/${id}`, { headers: writeHeaders({ etag }) }),
    );
  }
}

/** Fields shared by creation and metadata updates. */
function metadataBody(form: ParameterFormValue): Record<string, unknown> {
  const { name, category, businessDomain, description, unit } = form;
  const body: Record<string, unknown> = withoutEmpty({ name, category, businessDomain, description, unit });
  const constraints = constraintsBody(form);
  if (constraints) body['constraints'] = constraints;
  return body;
}

function constraintsBody({ min, max, pattern, allowedValues }: ParameterFormValue): ParameterConstraints | undefined {
  const constraints: ParameterConstraints = {};
  if (min != null) constraints.min = Number(min);
  if (max != null) constraints.max = Number(max);
  if (pattern) constraints.pattern = pattern;
  if (allowedValues) {
    constraints.allowedValues = allowedValues
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return Object.keys(constraints).length ? constraints : undefined;
}

function scopeBody({ channel, product, segment }: ParameterFormValue): Scope | undefined {
  const scope = Object.fromEntries(Object.entries({ channel, product, segment }).filter(([, value]) => value));
  return Object.keys(scope).length ? scope : undefined;
}

function withoutEmpty(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
}

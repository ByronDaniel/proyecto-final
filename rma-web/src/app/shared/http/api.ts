import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;
export const PAGE_SIZE = 20;
/** Largest page the API accepts. */
export const MAX_PAGE_SIZE = 100;

export interface WithEtag<T> {
  data: T;
  etag: string;
}

export interface WriteOptions {
  etag?: string;
  idempotencyKey?: string;
}

/** Builds the query string, skipping empty filters. */
export function queryParams(query: Record<string, string | number | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params = params.set(key, value);
  }
  return params;
}

/** Adds the optimistic concurrency (If-Match) and idempotency headers expected by the API. */
export function writeHeaders({ etag, idempotencyKey }: WriteOptions): HttpHeaders {
  let headers = new HttpHeaders();
  if (etag) headers = headers.set('If-Match', etag);
  if (idempotencyKey) headers = headers.set('Idempotency-Key', idempotencyKey);
  return headers;
}

export function withEtag<T>(response: HttpResponse<T>): WithEtag<T> {
  return { data: response.body as T, etag: response.headers.get('ETag') ?? '' };
}

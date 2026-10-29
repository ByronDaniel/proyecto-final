import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, PAGE_SIZE, queryParams } from '../../../shared/http/api';
import { Page } from '../../../shared/models/page';
import { AuditEvent, AuditFilter } from '../models/audit-event';

const AUDIT_EVENTS_URL = `${API_URL}/audit-events`;
const DEFAULT_RANGE_MS = 30 * 86400000;

/** The API expects a full date-time; dates like `2026-10-01` are sent as UTC midnight. */
function toDateTime(value: string): string {
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list({ page, from }: AuditFilter): Promise<Page<AuditEvent>> {
    const params = queryParams({
      page,
      size: PAGE_SIZE,
      from: from.trim() ? toDateTime(from) : new Date(Date.now() - DEFAULT_RANGE_MS).toISOString(),
    });
    return firstValueFrom(this.http.get<Page<AuditEvent>>(AUDIT_EVENTS_URL, { params }));
  }

  get(id: string): Promise<AuditEvent> {
    return firstValueFrom(this.http.get<AuditEvent>(`${AUDIT_EVENTS_URL}/${id}`));
  }
}

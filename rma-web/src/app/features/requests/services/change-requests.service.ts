import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, PAGE_SIZE, WithEtag, WriteOptions, queryParams, withEtag, writeHeaders } from '../../../shared/http/api';
import { Page } from '../../../shared/models/page';
import { ApprovalDecision, ChangeRequest, ChangeRequestFilter, ProposalTarget } from '../models/change-request';
import { ChangeRequestFormValue } from '../models/change-request-form';

const CHANGE_REQUESTS_URL = `${API_URL}/change-requests`;

@Injectable({ providedIn: 'root' })
export class ChangeRequestsService {
  private readonly http = inject(HttpClient);

  list({ page, status }: ChangeRequestFilter): Promise<Page<ChangeRequest>> {
    const params = queryParams({ page, size: PAGE_SIZE, status });
    return firstValueFrom(this.http.get<Page<ChangeRequest>>(CHANGE_REQUESTS_URL, { params }));
  }

  async get(id: string): Promise<WithEtag<ChangeRequest>> {
    return withEtag(
      await firstValueFrom(this.http.get<ChangeRequest>(`${CHANGE_REQUESTS_URL}/${id}`, { observe: 'response' })),
    );
  }

  /** Approval or rejection of a decided request; `null` while it is still undecided. */
  async getDecision(request: ChangeRequest): Promise<ApprovalDecision | null> {
    if (request.status !== 'APPROVED' && request.status !== 'REJECTED') return null;
    const type = request.status === 'APPROVED' ? 'approval' : 'rejection';
    return firstValueFrom(this.http.get<ApprovalDecision>(`${CHANGE_REQUESTS_URL}/${request.id}/${type}`));
  }

  create(target: ProposalTarget, form: ChangeRequestFormValue, idempotencyKey: string): Promise<ChangeRequest> {
    const body: Record<string, unknown> = {
      parameterId: target.id,
      changeType: form.changeType,
      reason: form.reason,
    };
    if (target.currentVersionNumber) body['baseVersionNumber'] = target.currentVersionNumber;
    else if (form.baseVersionNumber) body['baseVersionNumber'] = Number(form.baseVersionNumber);
    if (form.effectiveFrom) body['effectiveFrom'] = new Date(form.effectiveFrom).toISOString();
    if (form.effectiveTo) body['effectiveTo'] = new Date(form.effectiveTo).toISOString();
    if (form.changeType === 'SET_VALUE') body['proposedValue'] = parseValue(target.dataType, form.proposedValue);
    return firstValueFrom(
      this.http.post<ChangeRequest>(CHANGE_REQUESTS_URL, body, { headers: writeHeaders({ idempotencyKey }) }),
    );
  }

  approve(id: string, comment: string, options: WriteOptions): Promise<ApprovalDecision> {
    return this.decide(id, 'approval', comment ? { comment } : {}, options);
  }

  reject(id: string, reason: string, options: WriteOptions): Promise<ApprovalDecision> {
    return this.decide(id, 'rejection', { reason }, options);
  }

  /** Withdraws a pending request; only its creator may do it. */
  cancel(id: string, etag: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${CHANGE_REQUESTS_URL}/${id}`, { headers: writeHeaders({ etag }) }),
    );
  }

  private decide(id: string, type: 'approval' | 'rejection', body: object, options: WriteOptions) {
    return firstValueFrom(
      this.http.post<ApprovalDecision>(`${CHANGE_REQUESTS_URL}/${id}/${type}`, body, {
        headers: writeHeaders(options),
      }),
    );
  }
}

/** Converts the raw form input to the JSON type expected for the parameter. */
function parseValue(dataType: string, raw: string): unknown {
  switch (dataType) {
    case 'BOOLEAN':
      return raw === 'true';
    case 'INTEGER':
      return Number(raw);
    case 'JSON':
      return JSON.parse(raw);
    default:
      return raw;
  }
}

import { Component, inject } from '@angular/core';
import { DataSection } from '../../../../shared/components/data-section/data-section';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { errorMessage } from '../../../../shared/utils/error-message';
import { ChangeRequestDetail } from '../../components/change-request-detail/change-request-detail';
import { ChangeRequestsTable } from '../../components/change-requests-table/change-requests-table';
import { DecisionForm } from '../../components/decision-form/decision-form';
import { ApprovalDecision, ChangeRequest, ChangeRequestFilter, STATUS_FILTER_OPTIONS } from '../../models/change-request';
import { DecisionKind } from '../../models/change-request-form';
import { ChangeRequestsService } from '../../services/change-requests.service';

const MODAL_TITLES: Record<DecisionKind, string> = {
  approval: 'Aprobar propuesta',
  rejection: 'Rechazar propuesta',
};

@Component({
  selector: 'app-change-requests-page',
  imports: [PageHeader, DataSection, ChangeRequestsTable, ChangeRequestDetail, Modal, DecisionForm],
  templateUrl: './change-requests-page.html',
})
export class ChangeRequestsPage {
  private readonly changeRequests = inject(ChangeRequestsService);

  readonly statusOptions = STATUS_FILTER_OPTIONS;
  readonly modalTitles = MODAL_TITLES;

  rows: ChangeRequest[] = [];
  page = 0;
  total = 0;
  totalPages = 0;
  filter: ChangeRequestFilter['status'] = '';
  busy = false;
  error = '';
  notice = '';

  detail: ChangeRequest | null = null;
  decision: ApprovalDecision | null = null;
  modal: DecisionKind | null = null;
  private etag = '';
  private idempotencyKey = '';

  constructor() {
    this.load();
  }

  async load() {
    this.busy = true;
    this.error = '';
    try {
      const result = await this.changeRequests.list({ page: this.page, status: this.filter });
      this.rows = result.items;
      this.total = result.page.totalElements;
      this.totalPages = result.page.totalPages;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  search() {
    this.page = 0;
    this.load();
  }

  goToPage(page: number) {
    this.page = page;
    this.load();
  }

  async show(request: ChangeRequest) {
    this.error = '';
    this.decision = null;
    try {
      const { data, etag } = await this.changeRequests.get(request.id);
      this.detail = data;
      this.etag = etag;
      this.decision = await this.changeRequests.getDecision(data);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  openModal(kind: DecisionKind) {
    this.modal = kind;
    this.error = '';
    this.idempotencyKey = crypto.randomUUID();
  }

  async decide(text: string) {
    if (!this.detail) return;
    const { id } = this.detail;
    const options = { etag: this.etag, idempotencyKey: this.idempotencyKey };
    this.busy = true;
    this.error = '';
    try {
      if (this.modal === 'approval') await this.changeRequests.approve(id, text, options);
      else await this.changeRequests.reject(id, text, options);
      await this.finish('Cambios guardados correctamente.');
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async cancelRequest() {
    if (!this.detail || !confirm('¿Cancelar esta solicitud?')) return;
    try {
      await this.changeRequests.cancel(this.detail.id, this.etag);
      await this.finish('Operación completada.');
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private async finish(notice: string) {
    this.modal = null;
    this.detail = null;
    this.notice = notice;
    await this.load();
  }
}

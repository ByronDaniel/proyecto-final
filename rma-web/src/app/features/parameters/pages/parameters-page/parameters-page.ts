import { Component, computed, inject } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { AuthService } from '../../../auth/services/auth.service';
import { ChangeRequestForm } from '../../../requests/components/change-request-form/change-request-form';
import { ChangeRequestFormValue } from '../../../requests/models/change-request-form';
import { ChangeRequestsService } from '../../../requests/services/change-requests.service';
import { DataSection } from '../../../../shared/components/data-section/data-section';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { errorMessage } from '../../../../shared/utils/error-message';
import { ParameterDetail } from '../../components/parameter-detail/parameter-detail';
import { ParameterForm } from '../../components/parameter-form/parameter-form';
import { ParameterHistory } from '../../components/parameter-history/parameter-history';
import { ParametersTable } from '../../components/parameters-table/parameters-table';
import { Parameter } from '../../models/parameter';
import { ParameterFormValue } from '../../models/parameter-form';
import { ParameterVersion } from '../../models/parameter-version';
import { ParametersService } from '../../services/parameters.service';

type ParameterModal = 'create' | 'edit' | 'propose';

const MODAL_TITLES: Record<ParameterModal, string> = {
  create: 'Nuevo parámetro',
  edit: 'Editar metadatos',
  propose: 'Proponer cambio',
};

@Component({
  selector: 'app-parameters-page',
  imports: [
    PageHeader,
    DataSection,
    ParametersTable,
    ParameterDetail,
    ParameterHistory,
    Modal,
    ParameterForm,
    ChangeRequestForm,
    LucidePlus,
  ],
  templateUrl: './parameters-page.html',
})
export class ParametersPage {
  private readonly parameters = inject(ParametersService);
  private readonly changeRequests = inject(ChangeRequestsService);
  private readonly auth = inject(AuthService);

  readonly modalTitles = MODAL_TITLES;
  readonly canCreate = computed(() => this.auth.hasRole('MAKER', 'ADMIN'));

  rows: Parameter[] = [];
  page = 0;
  total = 0;
  totalPages = 0;
  filter = '';
  busy = false;
  error = '';
  notice = '';

  detail: Parameter | null = null;
  history: { parameter: Parameter; versions: ParameterVersion[] } | null = null;
  modal: ParameterModal | null = null;
  private etag = '';
  private idempotencyKey = '';

  constructor() {
    this.load();
  }

  async load() {
    this.busy = true;
    this.error = '';
    try {
      const result = await this.parameters.list({ page: this.page, code: this.filter });
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

  async show(parameter: Parameter) {
    this.error = '';
    try {
      const { data, etag } = await this.parameters.get(parameter.id);
      this.detail = data;
      this.etag = etag;
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  async showHistory(parameter: Parameter) {
    this.error = '';
    try {
      this.history = { parameter, versions: await this.parameters.versions(parameter.id) };
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  openModal(modal: ParameterModal) {
    this.modal = modal;
    this.error = '';
    this.idempotencyKey = crypto.randomUUID();
  }

  saveParameter(form: ParameterFormValue) {
    return this.submit(() =>
      this.modal === 'create'
        ? this.parameters.create(form, this.idempotencyKey)
        : this.parameters.update(this.detail!.id, form, this.etag, this.idempotencyKey),
    );
  }

  proposeChange(form: ChangeRequestFormValue) {
    const { id, dataType } = this.detail!;
    return this.submit(async () => {
      const baseVersionNumber = await this.parameters.baseVersionNumber(this.detail!);
      return this.changeRequests.create({ id, dataType, baseVersionNumber }, form, this.idempotencyKey);
    });
  }

  async retire() {
    if (!this.detail || !confirm('¿Dar de baja este borrador?')) return;
    try {
      await this.parameters.retire(this.detail.id, this.etag);
      await this.finish('Operación completada.');
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  private async submit(action: () => Promise<unknown>) {
    this.busy = true;
    this.error = '';
    try {
      await action();
      await this.finish('Cambios guardados correctamente.');
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  private async finish(notice: string) {
    this.modal = null;
    this.detail = null;
    this.notice = notice;
    await this.load();
  }
}

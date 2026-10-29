import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, RecordData } from './api';
import { LucideLayers, LucideClipboardList, LucideDatabase, LucideHistory, LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, LucideLayers, LucideClipboardList, LucideDatabase, LucideHistory, LucidePlus],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly api = inject(Api);
  username = '';
  password = '';
  busy = false;
  error = '';
  notice = '';
  tab = '';
  rows: RecordData[] = [];
  unavailable: RecordData[] = [];
  page = 0;
  totalPages = 0;
  total = 0;
  filter = '';
  detail: RecordData | null = null;
  decision: RecordData | null = null;
  detailEtag = '';
  modal = '';
  form: RecordData = {};
  pendingKey = '';

  constructor() { if (this.api.session) this.open(this.firstTab()); }
  firstTab() { return this.api.has('MAKER', 'CHECKER', 'ADMIN', 'AUDITOR') ? 'parameters' : 'values'; }
  tabs() { return [
    ...(this.api.has('MAKER', 'CHECKER', 'ADMIN', 'AUDITOR') ? [{ id: 'parameters', label: 'Parámetros' }, { id: 'requests', label: 'Solicitudes' }] : []),
    ...(this.api.has('CONSUMER') ? [{ id: 'values', label: 'Valores vigentes' }] : []),
    ...(this.api.has('AUDITOR', 'ADMIN') ? [{ id: 'audit', label: 'Auditoría' }] : [])
  ]; }
  title() { return this.tabs().find(item => item.id === this.tab)?.label ?? ''; }

  async login() {
    this.busy = true; this.error = '';
    try { await this.api.login(this.username, this.password); this.password = ''; this.resetView(); await this.open(this.firstTab()); }
    catch (error) { this.showError(error); }
    finally { this.busy = false; }
  }
  private resetView() { this.detail = null; this.decision = null; this.detailEtag = ''; this.modal = ''; this.form = {}; this.rows = []; this.unavailable = []; this.notice = ''; this.pendingKey = ''; this.page = 0; this.total = 0; this.totalPages = 0; }
  logout() { this.api.logout(); this.resetView(); this.password = ''; this.error = ''; }
  async open(tab: string) { this.tab = tab; this.page = 0; this.filter = ''; this.detail = null; await this.load(); }
  async load() {
    this.busy = true; this.error = '';
    try {
      const path = ({ parameters: 'parameters', requests: 'change-requests', values: 'parameter-values', audit: 'audit-events' } as Record<string, string>)[this.tab];
      const query: Record<string, string> = { page: String(this.page), size: '20' };
      if (this.tab === 'parameters' && this.filter) query['code'] = this.filter.toUpperCase();
      if (this.tab === 'requests' && this.filter) query['status'] = this.filter;
      if (this.tab === 'values' && this.filter) query['codes'] = this.filter.toUpperCase();
      if (this.tab === 'audit') query['from'] = this.filter || new Date(Date.now() - 30 * 86400000).toISOString();
      const response = await this.api.call('GET', path, undefined, { query });
      this.rows = response.body.items; this.unavailable = response.body.unavailable ?? [];
      this.total = response.body.page.totalElements; this.totalPages = response.body.page.totalPages;
    } catch (error) { this.showError(error); }
    finally { this.busy = false; }
  }
  async changePage(delta: number) { this.page += delta; await this.load(); }
  async show(row: RecordData) {
    this.error = '';
    this.decision = null;
    try {
      const path = this.tab === 'parameters' ? `parameters/${row['id']}` : this.tab === 'requests' ? `change-requests/${row['id']}` : this.tab === 'audit' ? `audit-events/${row['id']}` : `parameter-values/${row['code']}`;
      const response = await this.api.call('GET', path);
      this.detail = response.body; this.detailEtag = response.headers.get('ETag') ?? '';
      if (this.tab === 'requests' && ['APPROVED', 'REJECTED'].includes(this.detail?.['status'])) {
        const type = this.detail?.['status'] === 'APPROVED' ? 'approval' : 'rejection';
        this.decision = (await this.api.call('GET', `change-requests/${row['id']}/${type}`)).body;
      }
    } catch (error) { this.showError(error); }
  }
  begin(kind: string) {
    this.modal = kind; this.error = ''; this.pendingKey = crypto.randomUUID();
    if (kind === 'parameter') this.form = { code: '', name: '', dataType: 'STRING', category: '', businessDomain: '', description: '', unit: '', channel: '', product: '', segment: '', min: '', max: '', pattern: '', allowedValues: '' };
    else if (kind === 'edit') this.form = { name: this.detail?.['name'], category: this.detail?.['category'], businessDomain: this.detail?.['businessDomain'], description: this.detail?.['description'] ?? '', unit: this.detail?.['unit'] ?? '', min: this.detail?.['constraints']?.min ?? '', max: this.detail?.['constraints']?.max ?? '', pattern: this.detail?.['constraints']?.pattern ?? '', allowedValues: this.detail?.['constraints']?.allowedValues?.join(',') ?? '' };
    else if (kind === 'request') this.form = { changeType: 'SET_VALUE', proposedValue: '', baseVersionNumber: '', reason: '', effectiveFrom: '', effectiveTo: '' };
    else this.form = { reason: '', comment: '' };
  }
  async submit() {
    this.busy = true; this.error = '';
    try {
      if (this.modal === 'parameter' || this.modal === 'edit') {
        const { channel, product, segment, min, max, pattern, allowedValues, ...metadata } = this.form;
        const body: RecordData = Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== ''));
        const scope = Object.fromEntries(Object.entries({ channel, product, segment }).filter(([, value]) => value));
        if (this.modal === 'parameter' && Object.keys(scope).length) body['scope'] = scope;
        const constraints: RecordData = {};
        if (min !== '' && min != null) constraints['min'] = Number(min);
        if (max !== '' && max != null) constraints['max'] = Number(max);
        if (pattern) constraints['pattern'] = pattern;
        if (allowedValues) constraints['allowedValues'] = allowedValues.split(',').map((item: string) => item.trim()).filter(Boolean);
        if (Object.keys(constraints).length) body['constraints'] = constraints;
        await this.api.call(this.modal === 'parameter' ? 'POST' : 'PUT', this.modal === 'parameter' ? 'parameters' : `parameters/${this.detail?.['id']}`, body, { key: this.pendingKey, etag: this.detailEtag });
      } else if (this.modal === 'request') {
        const body: RecordData = { parameterId: this.detail?.['id'], changeType: this.form['changeType'], reason: this.form['reason'] };
        if (this.detail?.['currentVersionNumber']) body['baseVersionNumber'] = this.detail['currentVersionNumber'];
        else if (this.form['baseVersionNumber']) body['baseVersionNumber'] = Number(this.form['baseVersionNumber']);
        if (this.form['effectiveFrom']) body['effectiveFrom'] = new Date(this.form['effectiveFrom']).toISOString();
        if (this.form['effectiveTo']) body['effectiveTo'] = new Date(this.form['effectiveTo']).toISOString();
        if (body['changeType'] === 'SET_VALUE') {
          const type = this.detail?.['dataType'];
          body['proposedValue'] = type === 'BOOLEAN' ? this.form['proposedValue'] === 'true' : type === 'INTEGER' ? Number(this.form['proposedValue']) : type === 'JSON' ? JSON.parse(this.form['proposedValue']) : this.form['proposedValue'];
        }
        await this.api.call('POST', 'change-requests', body, { key: this.pendingKey });
      } else {
        const body = this.modal === 'approval' ? (this.form['comment'] ? { comment: this.form['comment'] } : {}) : { reason: this.form['reason'] };
        await this.api.call('POST', `change-requests/${this.detail?.['id']}/${this.modal}`, body, { key: this.pendingKey, etag: this.detailEtag });
      }
      this.modal = ''; this.detail = null; this.notice = 'Cambios guardados correctamente.'; await this.load();
    } catch (error) { this.showError(error); }
    finally { this.busy = false; }
  }
  async remove() {
    if (!this.detail || !confirm(this.tab === 'parameters' ? '¿Dar de baja este borrador?' : '¿Cancelar esta solicitud?')) return;
    try {
      await this.api.call('DELETE', `${this.tab === 'parameters' ? 'parameters' : 'change-requests'}/${this.detail['id']}`, undefined, { etag: this.detailEtag });
      this.detail = null; this.notice = 'Operación completada.'; await this.load();
    } catch (error) { this.showError(error); }
  }
  showError(error: any) { this.error = error?.error?.detail || error?.message || 'No se pudo completar la operación.'; if (error?.status === 412) this.error += ' Vuelve a abrir el detalle para actualizarlo.'; }
  value(value: unknown) { return value !== undefined && value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'); }
}

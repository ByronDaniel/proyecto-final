import { Component, inject } from '@angular/core';
import { DataSection } from '../../../../shared/components/data-section/data-section';
import { DetailDrawer } from '../../../../shared/components/detail-drawer/detail-drawer';
import { KeyValueList } from '../../../../shared/components/key-value-list/key-value-list';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { errorMessage } from '../../../../shared/utils/error-message';
import { AuditTable } from '../../components/audit-table/audit-table';
import { AuditEvent } from '../../models/audit-event';
import { AuditService } from '../../services/audit.service';

@Component({
  selector: 'app-audit-page',
  imports: [PageHeader, DataSection, AuditTable, DetailDrawer, KeyValueList],
  templateUrl: './audit-page.html',
})
export class AuditPage {
  private readonly audit = inject(AuditService);

  rows: AuditEvent[] = [];
  page = 0;
  total = 0;
  totalPages = 0;
  filter = '';
  busy = false;
  error = '';

  detail: AuditEvent | null = null;

  constructor() {
    this.load();
  }

  async load() {
    this.busy = true;
    this.error = '';
    try {
      const result = await this.audit.list({ page: this.page, from: this.filter });
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

  async show(event: AuditEvent) {
    this.error = '';
    try {
      this.detail = await this.audit.get(event.id);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }
}

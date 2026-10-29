import { Component, inject } from '@angular/core';
import { DataSection } from '../../../../shared/components/data-section/data-section';
import { DetailDrawer } from '../../../../shared/components/detail-drawer/detail-drawer';
import { KeyValueList } from '../../../../shared/components/key-value-list/key-value-list';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { errorMessage } from '../../../../shared/utils/error-message';
import { ParameterValuesTable } from '../../components/parameter-values-table/parameter-values-table';
import { CurrentValue, UnavailableValue } from '../../models/parameter-value';
import { ParameterValuesService } from '../../services/parameter-values.service';

@Component({
  selector: 'app-parameter-values-page',
  imports: [PageHeader, DataSection, ParameterValuesTable, DetailDrawer, KeyValueList],
  templateUrl: './parameter-values-page.html',
  styleUrl: './parameter-values-page.scss',
})
export class ParameterValuesPage {
  private readonly parameterValues = inject(ParameterValuesService);

  rows: CurrentValue[] = [];
  unavailable: UnavailableValue[] = [];
  page = 0;
  total = 0;
  totalPages = 0;
  filter = '';
  busy = false;
  error = '';

  detail: CurrentValue | null = null;

  constructor() {
    this.load();
  }

  async load() {
    this.busy = true;
    this.error = '';
    try {
      const result = await this.parameterValues.list({ page: this.page, codes: this.filter });
      this.rows = result.items;
      this.unavailable = result.unavailable ?? [];
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

  async show(value: CurrentValue) {
    this.error = '';
    try {
      this.detail = await this.parameterValues.get(value.code);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }
}

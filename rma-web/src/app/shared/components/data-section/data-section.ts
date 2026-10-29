import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Paginated list section: heading with total, filter, projected table, empty state and pagination.
 * The filter is a text input unless `filterOptions` is provided, in which case it is a select.
 */
@Component({
  selector: 'app-data-section',
  imports: [FormsModule],
  templateUrl: './data-section.html',
  styleUrl: './data-section.scss',
})
export class DataSection {
  readonly heading = input.required<string>();
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly busy = input(false);
  readonly empty = input(false);
  readonly filterPlaceholder = input('');
  readonly filterLabel = input('Filtrar');
  readonly filterOptions = input<FilterOption[]>();
  readonly filter = model('');

  readonly searchRequested = output<void>();
  readonly pageChange = output<number>();
}

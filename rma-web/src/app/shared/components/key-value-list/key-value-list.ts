import { Component, computed, input } from '@angular/core';
import { DisplayValuePipe } from '../../pipes/display-value.pipe';

/** Lists every field of a record, sorted by key. */
@Component({
  selector: 'app-key-value-list',
  imports: [DisplayValuePipe],
  templateUrl: './key-value-list.html',
  styleUrl: './key-value-list.scss',
})
export class KeyValueList {
  readonly data = input.required<object>();
  readonly entries = computed(() =>
    Object.entries(this.data()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

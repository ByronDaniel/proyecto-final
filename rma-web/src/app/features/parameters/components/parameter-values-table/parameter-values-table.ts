import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DisplayValuePipe } from '../../../../shared/pipes/display-value.pipe';
import { CurrentValue } from '../../models/parameter-value';

@Component({
  selector: 'app-parameter-values-table',
  imports: [DatePipe, DisplayValuePipe],
  templateUrl: './parameter-values-table.html',
})
export class ParameterValuesTable {
  readonly rows = input.required<CurrentValue[]>();
  readonly viewDetail = output<CurrentValue>();
}

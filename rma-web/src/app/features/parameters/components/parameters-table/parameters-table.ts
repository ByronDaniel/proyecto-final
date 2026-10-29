import { Component, input, output } from '@angular/core';
import { Parameter } from '../../models/parameter';

@Component({
  selector: 'app-parameters-table',
  templateUrl: './parameters-table.html',
})
export class ParametersTable {
  readonly rows = input.required<Parameter[]>();
  readonly viewDetail = output<Parameter>();
}

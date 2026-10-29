import { Component, input, output } from '@angular/core';
import { LucideHistory } from '@lucide/angular';
import { DisplayValuePipe } from '../../../../shared/pipes/display-value.pipe';
import { StatusTonePipe } from '../../../../shared/pipes/status-tone.pipe';
import { Parameter } from '../../models/parameter';

@Component({
  selector: 'app-parameters-table',
  imports: [StatusTonePipe, DisplayValuePipe, LucideHistory],
  templateUrl: './parameters-table.html',
  styleUrl: './parameters-table.scss',
})
export class ParametersTable {
  readonly rows = input.required<Parameter[]>();
  readonly viewDetail = output<Parameter>();
  readonly viewHistory = output<Parameter>();
}

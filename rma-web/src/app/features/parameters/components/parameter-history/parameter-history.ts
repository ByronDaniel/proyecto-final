import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DetailDrawer } from '../../../../shared/components/detail-drawer/detail-drawer';
import { DisplayValuePipe } from '../../../../shared/pipes/display-value.pipe';
import { StatusTonePipe } from '../../../../shared/pipes/status-tone.pipe';
import { Parameter } from '../../models/parameter';
import { ParameterVersion } from '../../models/parameter-version';
import { ParameterVersionDetail } from '../parameter-version-detail/parameter-version-detail';

/**
 * Published versions of a parameter, in the order received (approval date, newest first).
 * Each card shows a summary; clicking it opens a dialog with every field.
 */
@Component({
  selector: 'app-parameter-history',
  imports: [DetailDrawer, ParameterVersionDetail, DatePipe, DisplayValuePipe, StatusTonePipe],
  templateUrl: './parameter-history.html',
  styleUrl: './parameter-history.scss',
})
export class ParameterHistory {
  readonly parameter = input.required<Parameter>();
  readonly versions = input.required<ParameterVersion[]>();
  readonly closed = output<void>();

  selected: ParameterVersion | null = null;
}

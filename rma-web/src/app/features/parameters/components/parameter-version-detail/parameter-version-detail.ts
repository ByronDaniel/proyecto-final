import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Modal } from '../../../../shared/components/modal/modal';
import { DisplayValuePipe } from '../../../../shared/pipes/display-value.pipe';
import { StatusTonePipe } from '../../../../shared/pipes/status-tone.pipe';
import { ParameterVersion } from '../../models/parameter-version';

/** Dialog with every field of a published version. */
@Component({
  selector: 'app-parameter-version-detail',
  imports: [Modal, DatePipe, DisplayValuePipe, StatusTonePipe],
  templateUrl: './parameter-version-detail.html',
  styleUrl: './parameter-version-detail.scss',
})
export class ParameterVersionDetail {
  readonly version = input.required<ParameterVersion>();
  readonly unit = input<string>();
  readonly closed = output<void>();
}

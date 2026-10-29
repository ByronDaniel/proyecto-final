import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StatusTonePipe } from '../../../../shared/pipes/status-tone.pipe';
import { ChangeRequest } from '../../models/change-request';

@Component({
  selector: 'app-change-requests-table',
  imports: [DatePipe, StatusTonePipe],
  templateUrl: './change-requests-table.html',
})
export class ChangeRequestsTable {
  readonly rows = input.required<ChangeRequest[]>();
  readonly viewDetail = output<ChangeRequest>();
}

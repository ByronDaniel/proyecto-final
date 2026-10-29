import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ChangeRequest } from '../../models/change-request';

@Component({
  selector: 'app-change-requests-table',
  imports: [DatePipe],
  templateUrl: './change-requests-table.html',
})
export class ChangeRequestsTable {
  readonly rows = input.required<ChangeRequest[]>();
  readonly viewDetail = output<ChangeRequest>();
}

import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditEvent } from '../../models/audit-event';

@Component({
  selector: 'app-audit-table',
  imports: [DatePipe],
  templateUrl: './audit-table.html',
})
export class AuditTable {
  readonly rows = input.required<AuditEvent[]>();
  readonly viewDetail = output<AuditEvent>();
}

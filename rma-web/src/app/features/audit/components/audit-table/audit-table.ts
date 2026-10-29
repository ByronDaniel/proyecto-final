import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StatusTonePipe } from '../../../../shared/pipes/status-tone.pipe';
import { AuditEvent } from '../../models/audit-event';

@Component({
  selector: 'app-audit-table',
  imports: [DatePipe, StatusTonePipe],
  templateUrl: './audit-table.html',
})
export class AuditTable {
  readonly rows = input.required<AuditEvent[]>();
  readonly viewDetail = output<AuditEvent>();
}

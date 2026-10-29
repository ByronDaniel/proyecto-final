import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { DetailDrawer } from '../../../../shared/components/detail-drawer/detail-drawer';
import { KeyValueList } from '../../../../shared/components/key-value-list/key-value-list';
import { ApprovalDecision, ChangeRequest } from '../../models/change-request';

/** Request detail with its decision and the actions allowed for the current user. */
@Component({
  selector: 'app-change-request-detail',
  imports: [DetailDrawer, KeyValueList],
  templateUrl: './change-request-detail.html',
  styleUrl: './change-request-detail.scss',
})
export class ChangeRequestDetail {
  private readonly auth = inject(AuthService);

  readonly request = input.required<ChangeRequest>();
  readonly decision = input<ApprovalDecision | null>(null);

  readonly closed = output<void>();
  readonly cancelRequest = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();

  private readonly pending = computed(() => this.request().status === 'PENDING_APPROVAL');
  private readonly isOwn = computed(() => this.request().createdBy === this.auth.session()?.username);

  /** Only the maker who created it can withdraw a pending request. */
  readonly canCancel = computed(() => this.pending() && this.auth.hasRole('MAKER') && this.isOwn());
  /** A checker can decide on pending requests created by someone else. */
  readonly canDecide = computed(() => this.pending() && this.auth.hasRole('CHECKER') && !this.isOwn());
}

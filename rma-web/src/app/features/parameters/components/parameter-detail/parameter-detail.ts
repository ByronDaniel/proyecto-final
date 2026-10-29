import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { DetailDrawer } from '../../../../shared/components/detail-drawer/detail-drawer';
import { KeyValueList } from '../../../../shared/components/key-value-list/key-value-list';
import { Parameter } from '../../models/parameter';

/** Parameter detail with the actions allowed for the current user. */
@Component({
  selector: 'app-parameter-detail',
  imports: [DetailDrawer, KeyValueList],
  templateUrl: './parameter-detail.html',
})
export class ParameterDetail {
  private readonly auth = inject(AuthService);

  readonly parameter = input.required<Parameter>();

  readonly closed = output<void>();
  readonly edit = output<void>();
  readonly retire = output<void>();
  readonly propose = output<void>();

  readonly canManage = computed(() => this.auth.hasRole('MAKER', 'ADMIN'));
  readonly canPropose = computed(() => this.auth.hasRole('MAKER'));
}

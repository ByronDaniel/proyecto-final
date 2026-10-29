import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProposalTarget } from '../../models/change-request';
import { ChangeRequestFormValue, emptyChangeRequestForm } from '../../models/change-request-form';

/** Form to propose a value change, deactivation or reactivation of a parameter. */
@Component({
  selector: 'app-change-request-form',
  imports: [FormsModule],
  templateUrl: './change-request-form.html',
})
export class ChangeRequestForm {
  readonly target = input.required<ProposalTarget>();
  readonly busy = input(false);
  readonly error = input('');

  readonly submitted = output<ChangeRequestFormValue>();
  readonly cancelled = output<void>();

  readonly form = emptyChangeRequestForm();
}

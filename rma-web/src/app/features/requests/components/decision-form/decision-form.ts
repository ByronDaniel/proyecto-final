import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecisionKind } from '../../models/change-request-form';

/** Approval comment (optional) or rejection reason (required) for a pending request. */
@Component({
  selector: 'app-decision-form',
  imports: [FormsModule],
  templateUrl: './decision-form.html',
})
export class DecisionForm {
  readonly kind = input.required<DecisionKind>();
  readonly busy = input(false);
  readonly error = input('');

  /** Emits the comment (approval) or the reason (rejection). */
  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  text = '';
}

import { Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DATA_TYPES, Parameter } from '../../models/parameter';
import { ParameterFormValue, emptyParameterForm, parameterFormFrom } from '../../models/parameter-form';

/**
 * Creates a parameter, or edits the metadata of `parameter` when given.
 * Code, data type and scope are immutable, so they are only shown on creation.
 * Constraints are only shown when editing.
 */
@Component({
  selector: 'app-parameter-form',
  imports: [FormsModule],
  templateUrl: './parameter-form.html',
})
export class ParameterForm implements OnInit {
  readonly parameter = input<Parameter | null>(null);
  readonly busy = input(false);
  readonly error = input('');

  readonly submitted = output<ParameterFormValue>();
  readonly cancelled = output<void>();

  readonly dataTypes = DATA_TYPES;
  form = emptyParameterForm();

  get isCreate() {
    return !this.parameter();
  }

  ngOnInit() {
    const parameter = this.parameter();
    if (parameter) this.form = parameterFormFrom(parameter);
  }
}

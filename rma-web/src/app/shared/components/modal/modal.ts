import { Component, input, output } from '@angular/core';

/** Centered dialog that hosts a form; projected content is the body. */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  readonly heading = input.required<string>();
  readonly closed = output<void>();
}

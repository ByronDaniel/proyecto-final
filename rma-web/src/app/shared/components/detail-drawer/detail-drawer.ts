import { Component, input, output } from '@angular/core';

/** Side panel for record details; projected content is the body. Closes when clicking outside. */
@Component({
  selector: 'app-detail-drawer',
  templateUrl: './detail-drawer.html',
  styleUrl: './detail-drawer.scss',
})
export class DetailDrawer {
  readonly heading = input.required<string>();
  readonly closed = output<void>();
}

import { Component, input } from '@angular/core';

/** Page title block; projected content is rendered as the page actions. */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}

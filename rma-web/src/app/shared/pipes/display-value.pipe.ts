import { Pipe, PipeTransform } from '@angular/core';

/** Renders any API value as text: objects as JSON, missing values as a dash. */
@Pipe({ name: 'displayValue' })
export class DisplayValuePipe implements PipeTransform {
  transform(value: unknown): string {
    return value !== undefined && value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? '—');
  }
}

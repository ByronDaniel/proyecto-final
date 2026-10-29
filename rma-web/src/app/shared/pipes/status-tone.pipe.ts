import { Pipe, PipeTransform } from '@angular/core';

type Tone = 'success' | 'info' | 'warning' | 'neutral' | 'danger';

/** Color family for every status the API returns (parameters, versions, requests, audit outcomes). */
const TONES: Record<string, Tone> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  SUCCESS: 'success',
  SCHEDULED: 'info',
  DRAFT: 'warning',
  PENDING_APPROVAL: 'warning',
  EXPIRED: 'neutral',
  INACTIVE: 'neutral',
  CANCELLED: 'neutral',
  REJECTED: 'danger',
  DENIED: 'danger',
  FAILED: 'danger',
};

/** Badge modifier class for a status: `<span class="badge {{ status | statusTone }}">`. */
@Pipe({ name: 'statusTone' })
export class StatusTonePipe implements PipeTransform {
  transform(status: string): string {
    return `tone-${TONES[status] ?? 'neutral'}`;
  }
}

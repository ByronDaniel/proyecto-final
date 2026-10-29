import { ChangeType } from './change-request';

export interface ChangeRequestFormValue {
  changeType: ChangeType;
  /** Raw input; converted according to the parameter data type on submit. */
  proposedValue: string;
  /** Only asked for when the parameter has no current version. */
  baseVersionNumber: number | null;
  reason: string;
  /** `datetime-local` values. */
  effectiveFrom: string;
  effectiveTo: string;
}

export function emptyChangeRequestForm(): ChangeRequestFormValue {
  return {
    changeType: 'SET_VALUE',
    proposedValue: '',
    baseVersionNumber: null,
    reason: '',
    effectiveFrom: '',
    effectiveTo: '',
  };
}

export type DecisionKind = 'approval' | 'rejection';

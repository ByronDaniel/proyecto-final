import { Page } from '../../../shared/models/page';
import { DataType, Scope } from './parameter';

export interface CurrentValue {
  code: string;
  dataType: DataType;
  value: unknown;
  unit?: string;
  scope?: Scope;
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UnavailableValue {
  code: string;
  reason: 'NOT_FOUND' | 'INACTIVE' | 'NOT_EFFECTIVE';
}

export interface CurrentValuePage extends Page<CurrentValue> {
  unavailable?: UnavailableValue[];
}

export interface ParameterValueFilter {
  page: number;
  /** Comma-separated codes. */
  codes: string;
}

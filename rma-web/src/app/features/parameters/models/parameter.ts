export type DataType = 'MONEY' | 'PERCENTAGE' | 'INTEGER' | 'BOOLEAN' | 'DATE' | 'STRING' | 'JSON';
export type ParameterStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export const DATA_TYPES: DataType[] = ['STRING', 'MONEY', 'PERCENTAGE', 'INTEGER', 'BOOLEAN', 'DATE', 'JSON'];

export interface Scope {
  channel?: string;
  product?: string;
  segment?: string;
}

export interface ParameterConstraints {
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
}

export interface Parameter {
  id: string;
  code: string;
  name: string;
  description?: string;
  dataType: DataType;
  category: string;
  businessDomain: string;
  scope?: Scope;
  unit?: string;
  constraints?: ParameterConstraints;
  status: ParameterStatus;
  currentVersionNumber?: number | null;
  /** Value of the current version. Only sent by the list endpoint. */
  currentValue?: unknown;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ParameterFilter {
  page: number;
  code: string;
}

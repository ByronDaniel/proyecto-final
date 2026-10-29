import { DataType, Parameter } from './parameter';

/** Flat form model used to create a parameter or edit its metadata. */
export interface ParameterFormValue {
  code: string;
  name: string;
  dataType: DataType;
  category: string;
  businessDomain: string;
  description: string;
  unit: string;
  channel: string;
  product: string;
  segment: string;
  min: number | null;
  max: number | null;
  pattern: string;
  /** Comma-separated list. */
  allowedValues: string;
}

export function emptyParameterForm(): ParameterFormValue {
  return {
    code: '',
    name: '',
    dataType: 'STRING',
    category: '',
    businessDomain: '',
    description: '',
    unit: '',
    channel: '',
    product: '',
    segment: '',
    min: null,
    max: null,
    pattern: '',
    allowedValues: '',
  };
}

export function parameterFormFrom(parameter: Parameter): ParameterFormValue {
  return {
    ...emptyParameterForm(),
    name: parameter.name,
    category: parameter.category,
    businessDomain: parameter.businessDomain,
    description: parameter.description ?? '',
    unit: parameter.unit ?? '',
    min: parameter.constraints?.min ?? null,
    max: parameter.constraints?.max ?? null,
    pattern: parameter.constraints?.pattern ?? '',
    allowedValues: parameter.constraints?.allowedValues?.join(',') ?? '',
  };
}

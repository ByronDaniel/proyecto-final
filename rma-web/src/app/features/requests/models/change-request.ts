import { FilterOption } from '../../../shared/components/data-section/data-section';

export type ChangeType = 'SET_VALUE' | 'DEACTIVATE' | 'REACTIVATE';
export type ChangeRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ChangeRequest {
  id: string;
  parameterId: string;
  parameterCode: string;
  changeType: ChangeType;
  status: ChangeRequestStatus;
  proposedValue?: unknown;
  baseVersionNumber?: number;
  resultingVersionNumber?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface ApprovalDecision {
  changeRequestId: string;
  decision: 'APPROVED' | 'REJECTED';
  decidedBy: string;
  decidedAt: string;
  comment?: string;
  rejectionReason?: string;
  resultingVersionNumber?: number;
  publicationStatus?: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';
}

/** The parameter a change is proposed for. */
export interface ProposalTarget {
  id: string;
  dataType: string;
  /** Version the change is based on; required by the API once the parameter has published versions. */
  baseVersionNumber?: number | null;
}

export interface ChangeRequestFilter {
  page: number;
  status: ChangeRequestStatus | '';
}

export const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING_APPROVAL', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

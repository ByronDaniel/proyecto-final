export type VersionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';

/** Immutable version published when a change request is approved. */
export interface ParameterVersion {
  parameterId: string;
  versionNumber: number;
  status: VersionStatus;
  changeType: 'SET_VALUE' | 'DEACTIVATE' | 'REACTIVATE';
  value?: unknown;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeRequestId: string;
  reason?: string;
  createdBy: string;
  approvedBy: string;
  approvedAt: string;
}

import { Role } from '../../auth/models/role';

export interface AuditActor {
  id: string;
  type: 'USER' | 'APPLICATION' | 'SYSTEM';
  roles?: Role[];
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: AuditActor;
  operation: string;
  resourceType: 'PARAMETER' | 'CHANGE_REQUEST' | 'PARAMETER_VERSION';
  resourceId?: string;
  parameterId?: string;
  versionNumber?: number;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason?: string;
  correlationId: string;
  origin?: { sourceApplication?: string; ipAddress?: string };
  details?: Record<string, unknown>;
}

export interface AuditFilter {
  page: number;
  /** ISO date; defaults to the last 30 days when empty. */
  from: string;
}

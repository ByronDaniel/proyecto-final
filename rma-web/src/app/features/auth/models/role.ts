export type Role = 'MAKER' | 'CHECKER' | 'ADMIN' | 'AUDITOR' | 'CONSUMER';

/** Roles allowed to open each page. Shared by the routes and the sidebar navigation. */
export const PAGE_ACCESS = {
  parameters: ['MAKER', 'CHECKER', 'ADMIN', 'AUDITOR'],
  requests: ['MAKER', 'CHECKER', 'ADMIN', 'AUDITOR'],
  values: ['CONSUMER'],
  audit: ['AUDITOR', 'ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

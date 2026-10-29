import { Role } from './role';

export interface Session {
  token: string;
  username: string;
  roles: Role[];
  /** Epoch milliseconds. */
  expiresAt: number;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  /** Seconds. */
  expiresIn: number;
  roles?: Role[];
}

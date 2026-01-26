/**
 * JWT token payload structure.
 * This interface defines the shape of the decoded JWT token.
 */
export interface JwtPayload {
  /** User ID (subject claim) */
  sub: string;

  /** Club ID the user belongs to */
  clubId: string;

  /** Issued at timestamp (auto-set by JWT) */
  iat?: number;

  /** Expiration timestamp (auto-set by JWT) */
  exp?: number;
}

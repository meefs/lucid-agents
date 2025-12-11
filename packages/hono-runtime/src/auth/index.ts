/**
 * Better-Auth configuration for the Hono runtime
 *
 * This module configures authentication using better-auth with:
 * - Email/password authentication
 * - Drizzle ORM adapter for PostgreSQL
 * - Session management
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../store/drizzle/schema';

export interface AuthConfig {
  /** Drizzle database instance */
  db: PostgresJsDatabase<typeof schema>;
  /** Base URL for the auth server (defaults to BETTER_AUTH_URL env var) */
  baseURL?: string;
  /** Secret key for signing tokens (defaults to BETTER_AUTH_SECRET env var) */
  secret?: string;
  /** Enable email verification */
  emailVerification?: boolean;
  /** Trusted origins for CORS (client URLs that can make auth requests) */
  trustedOrigins?: string[];
}

/**
 * Create a better-auth instance configured for the Hono runtime
 *
 * @example
 * ```ts
 * import { createAuth } from './auth';
 * import { db } from './store/drizzle';
 *
 * const auth = createAuth({ db });
 * ```
 */
export function createAuth(config: AuthConfig) {
  const { db, baseURL, secret, emailVerification = false, trustedOrigins = [] } = config;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    baseURL: baseURL ?? process.env.BETTER_AUTH_URL,
    secret: secret ?? process.env.BETTER_AUTH_SECRET,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      // Auto sign-in after registration
      autoSignIn: true,
      // Require email verification before sign-in (optional)
      requireEmailVerification: emailVerification,
    },
    session: {
      // Session expires after 7 days
      expiresIn: 60 * 60 * 24 * 7,
      // Update session expiry on each request
      updateAge: 60 * 60 * 24,
      // Use cookies for session storage
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    // Rate limiting for auth endpoints
    rateLimit: {
      window: 60, // 1 minute window
      max: 10, // 10 requests per window
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

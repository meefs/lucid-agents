/**
 * Hono middleware for better-auth integration
 *
 * Provides middleware for:
 * - Session loading (populates user context on all requests)
 * - Authentication requirement (protects routes)
 */

import { createMiddleware } from 'hono/factory';
import type { Auth } from './index';

/**
 * User type from session
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session type
 */
export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Variables added to Hono context by auth middleware
 */
export interface AuthVariables {
  user: AuthUser | null;
  session: AuthSession | null;
}

/**
 * Create session middleware that loads the current session into context
 *
 * This middleware does NOT require authentication - it just loads
 * the session if one exists. Use `createRequireAuth` for protected routes.
 *
 * @example
 * ```ts
 * const sessionMiddleware = createSessionMiddleware(auth);
 * app.use('*', sessionMiddleware);
 *
 * // In a handler:
 * const user = c.get('user'); // AuthUser | null
 * ```
 */
export function createSessionMiddleware(auth: Auth) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      c.set('user', (session?.user as AuthUser) ?? null);
      c.set('session', (session?.session as AuthSession) ?? null);
    } catch {
      // Session retrieval failed, continue without auth
      c.set('user', null);
      c.set('session', null);
    }

    await next();
  });
}

/**
 * Create middleware that requires authentication
 *
 * Returns 401 Unauthorized if no valid session exists.
 *
 * @example
 * ```ts
 * const requireAuth = createRequireAuth(auth);
 * app.use('/api/agents/*', requireAuth);
 *
 * // In a handler - user is guaranteed to exist:
 * const user = c.get('user')!;
 * ```
 */
export function createRequireAuth(auth: Auth) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session?.user) {
        return c.json(
          {
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          401
        );
      }

      c.set('user', session.user as AuthUser);
      c.set('session', session.session as AuthSession);

      await next();
    } catch {
      return c.json(
        {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session',
        },
        401
      );
    }
  });
}

/**
 * Helper to get the authenticated user from context
 * Throws if user is not authenticated (use after requireAuth middleware)
 */
export function getAuthUser(c: { get: (key: 'user') => AuthUser | null }): AuthUser {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated - ensure requireAuth middleware is applied');
  }
  return user;
}

/**
 * Helper to get the owner ID from authenticated user
 * Returns defaultOwnerId if auth is disabled or user not authenticated
 */
export function getOwnerId(
  c: { get: (key: 'user') => AuthUser | null },
  defaultOwnerId?: string
): string {
  const user = c.get('user');
  if (user) {
    return user.id;
  }
  if (defaultOwnerId) {
    return defaultOwnerId;
  }
  throw new Error('User not authenticated and no default owner ID provided');
}

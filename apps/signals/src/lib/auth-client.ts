import { createAuthClient } from 'better-auth/react';

/**
 * Better-Auth client for the signals app.
 *
 * This client connects to the hono-runtime backend which handles authentication.
 * The baseURL should point to where the hono-runtime server is running.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',
});

// Export commonly used hooks and functions
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

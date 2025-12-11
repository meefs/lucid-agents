import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { createHonoRuntime } from '../app';
import { createDrizzleAgentStore } from '../store/drizzle';
import { createMemoryAgentStore } from '../store/memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../store/drizzle/schema';
import type { AgentStore } from '../store/types';

// Skip tests if no database URL is configured
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Helper to check if auth tables exist
async function checkAuthTablesExist(connectionString: string): Promise<boolean> {
  const client = postgres(connectionString, { max: 1 });
  try {
    const result = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'session'
      ) as exists
    `;
    await client.end();
    return result[0]?.exists === true;
  } catch {
    await client.end();
    return false;
  }
}

// ===========================================================================
// Auth Disabled Mode Tests (no database required)
// ===========================================================================

describe('Auth Disabled Mode', () => {
  let store: AgentStore;
  let app: ReturnType<typeof createHonoRuntime>;

  beforeEach(() => {
    store = createMemoryAgentStore();
    app = createHonoRuntime({
      store,
      auth: { disabled: true },
      defaultOwnerId: 'test-owner',
    });
  });

  it('allows requests without authentication when disabled', async () => {
    const res = await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'no-auth-agent',
        name: 'No Auth Agent',
        entrypoints: [
          { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const agent = await res.json();
    expect(agent.ownerId).toBe('test-owner');
  });

  it('uses default owner ID for all requests', async () => {
    // Create agent
    await app.request('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'owner-test',
        name: 'Owner Test',
        entrypoints: [
          { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
        ],
      }),
    });

    // List should return the agent
    const listRes = await app.request('/api/agents');
    expect(listRes.status).toBe(200);
    const body = await listRes.json();
    expect(body.agents).toHaveLength(1);
    expect(body.agents[0].ownerId).toBe('test-owner');
  });

  it('allows public routes without auth', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Auth Integration Tests (requires database with auth tables)
// ===========================================================================

describe('Auth Integration', () => {
  const shouldSkip = !TEST_DATABASE_URL;
  let client: ReturnType<typeof postgres> | null = null;
  let db: ReturnType<typeof drizzle> | null = null;
  let store: AgentStore | null = null;
  let app: ReturnType<typeof createHonoRuntime> | null = null;
  let authTablesExist = false;

  beforeAll(async () => {
    if (shouldSkip) {
      console.log('Skipping auth integration tests: No TEST_DATABASE_URL set');
      return;
    }

    // Check if auth tables exist before running tests
    authTablesExist = await checkAuthTablesExist(TEST_DATABASE_URL!);

    if (!authTablesExist) {
      console.log('Skipping auth integration tests: Auth tables do not exist');
      console.log('Run migrations first: DATABASE_URL=<test_db_url> bun run db:migrate');
      return;
    }

    client = postgres(TEST_DATABASE_URL!, { max: 1 });
    db = drizzle(client, { schema });

    // Clear auth tables before tests
    await db.delete(schema.session);
    await db.delete(schema.account);
    await db.delete(schema.verification);
    await db.delete(schema.user);
    await db.delete(schema.agents);
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  beforeEach(async () => {
    if (shouldSkip || !authTablesExist || !db) return;

    // Clear tables between tests
    await db.delete(schema.session);
    await db.delete(schema.account);
    await db.delete(schema.verification);
    await db.delete(schema.user);
    await db.delete(schema.agents);

    store = createDrizzleAgentStore({
      connectionString: TEST_DATABASE_URL!,
      maxConnections: 1,
    });

    app = createHonoRuntime({
      store,
      auth: {
        secret: 'test-secret-at-least-32-characters-long',
        baseURL: 'http://localhost:8787',
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Auth Routes
  // ---------------------------------------------------------------------------

  describe('Auth Routes', () => {
    it.skipIf(shouldSkip || !authTablesExist)('mounts auth handler at /api/auth/*', async () => {
      const res = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
          name: 'Test User',
        }),
      });

      // Should not be 404 - auth routes are mounted
      expect(res.status).not.toBe(404);
    });

    it.skipIf(shouldSkip || !authTablesExist)('can sign up a new user', async () => {
      const res = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'securepassword123',
          name: 'New User',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.user.name).toBe('New User');
    });

    it.skipIf(shouldSkip || !authTablesExist)('rejects duplicate email on sign up', async () => {
      // First signup
      await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        }),
      });

      // Second signup with same email
      const res = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        }),
      });

      // Should fail - duplicate email
      expect(res.status).not.toBe(200);
    });

    it.skipIf(shouldSkip || !authTablesExist)('can sign in with email and password', async () => {
      // First sign up
      await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'signin@example.com',
          password: 'password123',
          name: 'Sign In User',
        }),
      });

      // Then sign in
      const res = await app!.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'signin@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('signin@example.com');
    });

    it.skipIf(shouldSkip || !authTablesExist)('rejects invalid password on sign in', async () => {
      // First sign up
      await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrongpass@example.com',
          password: 'correctpassword',
          name: 'Wrong Pass User',
        }),
      });

      // Try to sign in with wrong password
      const res = await app!.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrongpass@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(res.status).not.toBe(200);
    });

    it.skipIf(shouldSkip || !authTablesExist)('can get session with valid token', async () => {
      // Sign up and get session cookie
      const signupRes = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session@example.com',
          password: 'password123',
          name: 'Session User',
        }),
      });

      const cookies = signupRes.headers.get('set-cookie');
      expect(cookies).toBeDefined();

      // Get session using the cookie
      const sessionRes = await app!.request('/api/auth/get-session', {
        headers: {
          Cookie: cookies!,
        },
      });

      expect(sessionRes.status).toBe(200);
      const body = await sessionRes.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('session@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // Auth-Protected Agent Routes
  // ---------------------------------------------------------------------------

  describe('Auth-Protected Agent Routes', () => {
    it.skipIf(shouldSkip || !authTablesExist)('allows agent creation when authenticated', async () => {
      // Sign up to get authenticated
      const signupRes = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'agent-creator@example.com',
          password: 'password123',
          name: 'Agent Creator',
        }),
      });

      const cookies = signupRes.headers.get('set-cookie');

      // Create agent with auth
      const createRes = await app!.request('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies!,
        },
        body: JSON.stringify({
          slug: 'auth-test-agent',
          name: 'Auth Test Agent',
          entrypoints: [
            { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
          ],
        }),
      });

      expect(createRes.status).toBe(201);
      const agent = await createRes.json();
      expect(agent.slug).toBe('auth-test-agent');
    });

    it.skipIf(shouldSkip || !authTablesExist)('associates agents with authenticated user', async () => {
      // Sign up user 1
      const signup1 = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user1@example.com',
          password: 'password123',
          name: 'User 1',
        }),
      });
      const cookies1 = signup1.headers.get('set-cookie');
      const user1 = (await signup1.json()).user;

      // Create agent as user 1
      const createRes = await app!.request('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies1!,
        },
        body: JSON.stringify({
          slug: 'user1-agent',
          name: 'User 1 Agent',
          entrypoints: [
            { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
          ],
        }),
      });

      expect(createRes.status).toBe(201);
      const agent = await createRes.json();
      expect(agent.ownerId).toBe(user1.id);
    });

    it.skipIf(shouldSkip || !authTablesExist)('user can only list their own agents', async () => {
      // Sign up user 1 and create agent
      const signup1 = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner1@example.com',
          password: 'password123',
          name: 'Owner 1',
        }),
      });
      const cookies1 = signup1.headers.get('set-cookie');

      await app!.request('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies1!,
        },
        body: JSON.stringify({
          slug: 'owner1-agent',
          name: 'Owner 1 Agent',
          entrypoints: [
            { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
          ],
        }),
      });

      // Sign up user 2
      const signup2 = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner2@example.com',
          password: 'password123',
          name: 'Owner 2',
        }),
      });
      const cookies2 = signup2.headers.get('set-cookie');

      // User 2 lists agents - should not see user 1's agent
      const listRes = await app!.request('/api/agents', {
        headers: { Cookie: cookies2! },
      });

      expect(listRes.status).toBe(200);
      const body = await listRes.json();
      expect(body.agents).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Session Middleware
  // ---------------------------------------------------------------------------

  describe('Session Middleware', () => {
    it.skipIf(shouldSkip || !authTablesExist)('loads session for authenticated requests', async () => {
      // Sign up
      const signupRes = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'middleware@example.com',
          password: 'password123',
          name: 'Middleware User',
        }),
      });
      const cookies = signupRes.headers.get('set-cookie');

      // Request with auth cookie
      const agentsRes = await app!.request('/api/agents', {
        headers: { Cookie: cookies! },
      });

      expect(agentsRes.status).toBe(200);
    });

    it.skipIf(shouldSkip || !authTablesExist)('allows unauthenticated requests to public routes', async () => {
      // Health check should work without auth
      const res = await app!.request('/health');
      expect(res.status).toBe(200);
    });

    it.skipIf(shouldSkip || !authTablesExist)('allows agent invocation without authentication', async () => {
      // Sign up and create agent
      const signupRes = await app!.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invoke@example.com',
          password: 'password123',
          name: 'Invoke User',
        }),
      });
      const cookies = signupRes.headers.get('set-cookie');

      const createRes = await app!.request('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies!,
        },
        body: JSON.stringify({
          slug: 'public-invoke-agent',
          name: 'Public Invoke Agent',
          entrypoints: [
            { key: 'echo', handlerType: 'builtin', handlerConfig: { name: 'echo' } },
          ],
        }),
      });
      const agent = await createRes.json();

      // Invoke WITHOUT auth - should work (invoke is public)
      const invokeRes = await app!.request(
        `/agents/${agent.id}/entrypoints/echo/invoke`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: { message: 'hello' } }),
        }
      );

      expect(invokeRes.status).toBe(200);
      const result = await invokeRes.json();
      expect(result.output).toEqual({ message: 'hello' });
    });
  });
});

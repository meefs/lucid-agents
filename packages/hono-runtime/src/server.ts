/**
 * Development server for @lucid-agents/hono-runtime
 *
 * Run with: bun run src/server.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   BETTER_AUTH_SECRET - Secret for auth session signing
 *   BETTER_AUTH_URL - Base URL for auth (defaults to http://localhost:PORT)
 *   CORS_ORIGIN - Allowed CORS origin (defaults to http://localhost:3000)
 *   PORT - Server port (defaults to 8787)
 */

import { createHonoRuntime } from './app';
import { createDrizzleAgentStore } from './store/drizzle';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  console.error('Example: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lucid_agents');
  process.exit(1);
}

// Create Drizzle store with PostgreSQL
const store = createDrizzleAgentStore({
  connectionString: databaseUrl,
  maxConnections: 10,
});

// Get port from environment or default to 8787
const port = parseInt(process.env.PORT ?? '8787', 10);

// Create Hono app with auth enabled
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const app = createHonoRuntime({
  store,
  openapi: {
    title: 'Lucid Agents Runtime (Dev)',
    version: '0.1.0',
    description: 'Development server for testing the multi-agent runtime',
  },
  auth: {
    baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
    secret: process.env.BETTER_AUTH_SECRET,
  },
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

console.log('');
console.log('🚀 Lucid Agents Runtime');
console.log('========================');
console.log(`   Server:    http://localhost:${port}`);
console.log(`   Swagger:   http://localhost:${port}/swagger`);
console.log(`   OpenAPI:   http://localhost:${port}/doc`);
console.log(`   Auth:      http://localhost:${port}/api/auth`);
console.log('');
console.log('Quick start:');
console.log('  1. Visit /swagger to explore the API');
console.log('  2. POST /api/auth/sign-up/email to create a user');
console.log('  3. POST /api/auth/sign-in/email to sign in');
console.log('  4. POST /api/agents to create an agent');
console.log('');

// Start server
Bun.serve({
  port,
  fetch: app.fetch,
});

// @lucid-agents/hono-runtime
// Stateless multi-agent Hono runtime with OpenAPI support

// Main app factory (with OpenAPI validation and auto-generated docs)
export { createHonoRuntime } from './app';
export type { HonoRuntimeConfig, AuthOptions } from './app';

// Simple version without OpenAPI validation (for lighter usage)
export { createHonoRuntime as createHonoRuntimeSimple } from './app-simple';
export type { HonoRuntimeConfig as HonoRuntimeConfigSimple } from './app-simple';

// Store
export {
  createMemoryAgentStore,
  createDrizzleAgentStore,
  DrizzleAgentStore,
  agentsTable,
  SlugExistsError,
} from './store';
export type {
  AgentStore,
  AgentDefinition,
  CreateAgentInput,
  SerializedEntrypoint,
  SerializedPaymentsConfig,
  SerializedWalletsConfig,
  SerializedA2AConfig,
  ListOptions,
  DrizzleStoreOptions,
  AgentRow,
  NewAgentRow,
} from './store';

// Factory (for building agent runtimes from definitions)
export {
  buildRuntimeForAgent,
  RuntimeCache,
} from './factory';
export type { RuntimeFactoryConfig } from './factory';

// OpenAPI schemas and routes (for advanced usage)
export * as schemas from './openapi/schemas';
export * as routes from './openapi/routes';

// Auth (for external usage)
export { createAuth } from './auth';
export type { Auth, AuthConfig } from './auth';
export {
  createSessionMiddleware,
  createRequireAuth,
  getAuthUser,
  getOwnerId,
} from './auth/middleware';
export type {
  AuthUser,
  AuthSession,
  AuthVariables,
} from './auth/middleware';

// Auth schema tables (for advanced usage)
export {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
} from './store/drizzle/schema';
export type {
  UserRow,
  NewUserRow,
  SessionRow,
  NewSessionRow,
  AccountRow,
  NewAccountRow,
  VerificationRow,
  NewVerificationRow,
} from './store/drizzle/schema';

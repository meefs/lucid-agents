import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  serial,
  bigint,
} from 'drizzle-orm/pg-core';
import type {
  SerializedEntrypoint,
  SerializedPaymentsConfig,
  SerializedWalletsConfig,
  SerializedA2AConfig,
  SerializedAP2Config,
  SerializedAnalyticsConfig,
  SerializedIdentityConfig,
} from '../types';

export const agents = pgTable(
  'agents',
  {
    // Primary key
    id: text('id').primaryKey(),

    // Core fields
    ownerId: text('owner_id').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    version: text('version').notNull().default('1.0.0'),
    enabled: boolean('enabled').notNull().default(true),

    // JSON fields (complex nested structures)
    entrypoints: jsonb('entrypoints')
      .notNull()
      .$type<SerializedEntrypoint[]>()
      .default([]),
    metadata: jsonb('metadata')
      .notNull()
      .$type<Record<string, unknown>>()
      .default({}),

    // Extension configs (optional JSON)
    paymentsConfig: jsonb('payments_config').$type<SerializedPaymentsConfig>(),
    walletsConfig: jsonb('wallets_config').$type<SerializedWalletsConfig>(),
    a2aConfig: jsonb('a2a_config').$type<SerializedA2AConfig>(),
    ap2Config: jsonb('ap2_config').$type<SerializedAP2Config>(),
    analyticsConfig: jsonb('analytics_config').$type<SerializedAnalyticsConfig>(),
    identityConfig: jsonb('identity_config').$type<SerializedIdentityConfig>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    uniqueIndex('agents_slug_unique_idx').on(table.slug),
    index('agents_owner_id_idx').on(table.ownerId),
    index('agents_created_at_idx').on(table.createdAt),
  ]
);

// Type inference
export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;

// =============================================================================
// Payments Table
// =============================================================================

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    agentId: text('agent_id'),
    groupName: text('group_name').notNull(),
    scope: text('scope').notNull(),
    direction: text('direction').notNull(), // 'outgoing' | 'incoming'
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    timestamp: bigint('timestamp', { mode: 'bigint' }).notNull(),
  },
  table => [
    index('idx_agent_group_scope').on(table.agentId, table.groupName, table.scope),
    index('idx_group_scope').on(table.groupName, table.scope),
    index('idx_timestamp').on(table.timestamp),
    index('idx_direction').on(table.direction),
  ]
);

// Type inference
export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;

// =============================================================================
// Better-Auth Tables
// =============================================================================

/**
 * User table - stores user accounts
 */
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    uniqueIndex('user_email_idx').on(table.email),
  ]
);

export type UserRow = typeof user.$inferSelect;
export type NewUserRow = typeof user.$inferInsert;

/**
 * Session table - stores active user sessions
 */
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('session_user_id_idx').on(table.userId),
    uniqueIndex('session_token_idx').on(table.token),
  ]
);

export type SessionRow = typeof session.$inferSelect;
export type NewSessionRow = typeof session.$inferInsert;

/**
 * Account table - stores OAuth provider accounts linked to users
 */
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('account_user_id_idx').on(table.userId),
  ]
);

export type AccountRow = typeof account.$inferSelect;
export type NewAccountRow = typeof account.$inferInsert;

/**
 * Verification table - stores email verification and password reset tokens
 */
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('verification_identifier_idx').on(table.identifier),
  ]
);

export type VerificationRow = typeof verification.$inferSelect;
export type NewVerificationRow = typeof verification.$inferInsert;

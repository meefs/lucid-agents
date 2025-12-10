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

import { eq, and, sql, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  PaymentRecord,
  PaymentDirection,
} from '@lucid-agents/types/payments';
import type { PaymentStorage } from '@lucid-agents/payments';
import { payments } from './schema';
import type * as schema from './schema';

/**
 * Drizzle-based payment storage implementation.
 * Uses the same database connection as the agent store.
 */
export class DrizzlePaymentStorage implements PaymentStorage {
  constructor(
    private db: PostgresJsDatabase<typeof schema>,
    private agentId?: string
  ) {}

  async recordPayment(
    record: Omit<PaymentRecord, 'id' | 'timestamp'>
  ): Promise<void> {
    if (record.amount <= 0n) {
      return;
    }

    await this.db.insert(payments).values({
      agentId: this.agentId ?? null,
      groupName: record.groupName,
      scope: record.scope,
      direction: record.direction,
      amount: record.amount,
      timestamp: BigInt(Date.now()),
    });
  }

  async getTotal(
    groupName: string,
    scope: string,
    direction: PaymentDirection,
    windowMs?: number
  ): Promise<bigint> {
    const conditions = [
      eq(payments.groupName, groupName),
      eq(payments.scope, scope),
      eq(payments.direction, direction),
    ];

    if (this.agentId) {
      conditions.push(eq(payments.agentId, this.agentId));
    } else {
      conditions.push(sql`${payments.agentId} IS NULL`);
    }

    if (windowMs !== undefined) {
      const cutoff = BigInt(Date.now() - windowMs);
      conditions.push(sql`${payments.timestamp} > ${cutoff}`);
    }

    const result = await this.db
      .select({
        total: sql<bigint>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(and(...conditions));

    return result[0]?.total ?? 0n;
  }

  async getAllRecords(
    groupName?: string,
    scope?: string,
    direction?: PaymentDirection,
    windowMs?: number
  ): Promise<PaymentRecord[]> {
    const conditions = [];

    if (this.agentId) {
      conditions.push(eq(payments.agentId, this.agentId));
    } else {
      conditions.push(sql`${payments.agentId} IS NULL`);
    }

    if (groupName) {
      conditions.push(eq(payments.groupName, groupName));
    }
    if (scope) {
      conditions.push(eq(payments.scope, scope));
    }
    if (direction) {
      conditions.push(eq(payments.direction, direction));
    }
    if (windowMs !== undefined) {
      const cutoff = BigInt(Date.now() - windowMs);
      conditions.push(sql`${payments.timestamp} > ${cutoff}`);
    }

    const rows = await this.db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.timestamp));

    return rows.map(row => ({
      id: row.id,
      groupName: row.groupName,
      scope: row.scope,
      direction: row.direction as PaymentDirection,
      amount: row.amount,
      timestamp: Number(row.timestamp),
    }));
  }

  async clear(): Promise<void> {
    if (this.agentId) {
      await this.db.delete(payments).where(eq(payments.agentId, this.agentId));
    } else {
      await this.db.delete(payments).where(sql`${payments.agentId} IS NULL`);
    }
  }
}

/**
 * Create a Drizzle-based payment storage instance.
 */
export function createDrizzlePaymentStorage(
  db: PostgresJsDatabase<typeof schema>,
  agentId?: string
): PaymentStorage {
  return new DrizzlePaymentStorage(db, agentId);
}


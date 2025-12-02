/**
 * Spending tracker for total spending limits (stateful, in-memory).
 * Tracks spending per policy group and scope (global, target, endpoint).
 * All state is lost on restart - this is acceptable for now.
 */
type SpendingEntry = {
  amount: bigint;
  timestamp: number;
};

type ScopeKey = string;

/**
 * Tracks spending per policy group and scope for enforcing total spending limits.
 * Maintains in-memory state that is lost on restart.
 */
class SpendingTracker {
  private spending: Map<string, Map<ScopeKey, SpendingEntry[]>> = new Map();

  /**
   * Checks if a spending limit would be exceeded.
   * @param groupName - Policy group name
   * @param scope - Scope key ("global", target URL, or endpoint URL)
   * @param maxTotalUsd - Maximum total spending in USD
   * @param windowMs - Optional time window in milliseconds (if not provided, lifetime limit)
   * @param requestedAmount - Amount requested in base units (USDC has 6 decimals)
   * @returns Result indicating if allowed and current total
   */
  checkLimit(
    groupName: string,
    scope: string,
    maxTotalUsd: number,
    windowMs: number | undefined,
    requestedAmount: bigint
  ): { allowed: boolean; reason?: string; currentTotal?: bigint } {
    const maxTotalBaseUnits = BigInt(Math.floor(maxTotalUsd * 1_000_000));

    let groupSpending = this.spending.get(groupName);
    if (!groupSpending) {
      groupSpending = new Map();
      this.spending.set(groupName, groupSpending);
    }

    let entries = groupSpending.get(scope);
    if (!entries) {
      entries = [];
      groupSpending.set(scope, entries);
    }

    const now = Date.now();
    if (windowMs !== undefined) {
      const cutoff = now - windowMs;
      const validEntries = entries.filter(entry => entry.timestamp > cutoff);
      groupSpending.set(scope, validEntries);
      entries = validEntries;
    }

    const currentTotal = entries.reduce((sum, entry) => sum + entry.amount, 0n);

    const newTotal = currentTotal + requestedAmount;
    if (newTotal > maxTotalBaseUnits) {
      return {
        allowed: false,
        reason: `Total spending limit exceeded for policy group "${groupName}" at scope "${scope}". Current: ${currentTotal / 1000000n} USDC, Requested: ${requestedAmount / 1000000n} USDC, Limit: ${maxTotalUsd} USDC`,
        currentTotal,
      };
    }

    return {
      allowed: true,
      currentTotal,
    };
  }

  /**
   * Records spending after a successful payment.
   * @param groupName - Policy group name
   * @param scope - Scope key ("global", target URL, or endpoint URL)
   * @param amount - Amount spent in base units
   */
  recordSpending(groupName: string, scope: string, amount: bigint): void {
    if (amount <= 0n) {
      return;
    }

    let groupSpending = this.spending.get(groupName);
    if (!groupSpending) {
      groupSpending = new Map();
      this.spending.set(groupName, groupSpending);
    }

    let entries = groupSpending.get(scope);
    if (!entries) {
      entries = [];
      groupSpending.set(scope, entries);
    }

    entries.push({
      amount,
      timestamp: Date.now(),
    });

    groupSpending.set(scope, entries);
  }

  /**
   * Gets the current total spending for a scope (for informational purposes).
   * @param groupName - Policy group name
   * @param scope - Scope key
   * @param windowMs - Optional time window to filter entries
   * @returns Current total in base units, or undefined if no entries
   */
  getCurrentTotal(
    groupName: string,
    scope: string,
    windowMs?: number
  ): bigint | undefined {
    const groupSpending = this.spending.get(groupName);
    if (!groupSpending) {
      return undefined;
    }

    let entries = groupSpending.get(scope);
    if (!entries || entries.length === 0) {
      return undefined;
    }

    if (windowMs !== undefined) {
      const cutoff = Date.now() - windowMs;
      entries = entries.filter(entry => entry.timestamp > cutoff);
    }

    return entries.reduce((sum, entry) => sum + entry.amount, 0n);
  }

  /**
   * Clears all spending data (useful for testing or reset).
   */
  clear(): void {
    this.spending.clear();
  }
}

export type { SpendingTracker };

/**
 * Creates a new spending tracker instance.
 * @returns A new SpendingTracker instance for tracking spending limits
 */
export function createSpendingTracker(): SpendingTracker {
  return new SpendingTracker();
}


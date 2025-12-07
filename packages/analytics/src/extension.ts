import type {
  AgentRuntime,
  BuildContext,
  Extension,
} from '@lucid-agents/types/core';
import type { PaymentTracker } from '@lucid-agents/payments';

/**
 * Analytics runtime that reads from payment tracker.
 */
export type AnalyticsRuntime = {
  /** Payment tracker instance */
  readonly paymentTracker: PaymentTracker | undefined;
};

/**
 * Analytics extension function.
 * Reads payment data from runtime.payments.paymentTracker.
 */
export function analytics(): Extension<AnalyticsRuntime> {
  return {
    name: 'analytics',
    build(ctx: BuildContext): AnalyticsRuntime {
      return {
        get paymentTracker() {
          return ctx.runtime.payments?.paymentTracker as
            | PaymentTracker
            | undefined;
        },
      };
    },
  };
}


import { z } from 'zod';

/**
 * Zod schema for SpendingLimit.
 */
const SpendingLimitSchema = z.object({
  maxPaymentUsd: z.number().positive().optional(),
  maxTotalUsd: z.number().positive().optional(),
  windowMs: z.number().int().positive().optional(),
});

/**
 * Zod schema for SpendingLimitsConfig.
 */
const SpendingLimitsConfigSchema = z.object({
  global: SpendingLimitSchema.optional(),
  perTarget: z.record(z.string(), SpendingLimitSchema).optional(),
  perEndpoint: z.record(z.string(), SpendingLimitSchema).optional(),
});

/**
 * Zod schema for RateLimitConfig.
 */
const RateLimitConfigSchema = z.object({
  maxPayments: z.number().int().positive(),
  windowMs: z.number().int().positive(),
});

/**
 * Zod schema for PaymentPolicyGroup.
 */
export const PaymentPolicyGroupSchema = z.object({
  name: z.string().min(1),
  spendingLimits: SpendingLimitsConfigSchema.optional(),
  allowedRecipients: z.array(z.string()).optional(),
  blockedRecipients: z.array(z.string()).optional(),
  rateLimits: RateLimitConfigSchema.optional(),
});

/**
 * Zod schema for PaymentPolicyGroup array.
 */
export const PaymentPolicyGroupsSchema = z.array(PaymentPolicyGroupSchema);


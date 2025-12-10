import { createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { AgentIdParamSchema, ErrorSchema } from '../schemas';

// =============================================================================
// Analytics Summary Schema
// =============================================================================

export const AnalyticsSummarySchema = z
  .object({
    outgoingTotal: z.string().openapi({
      example: '1000000',
      description: 'Total outgoing payments in base units (6 decimals)',
    }),
    incomingTotal: z.string().openapi({
      example: '5000000',
      description: 'Total incoming payments in base units (6 decimals)',
    }),
    netTotal: z.string().openapi({
      example: '4000000',
      description: 'Net total (incoming - outgoing) in base units',
    }),
    outgoingCount: z.number().openapi({
      example: 10,
      description: 'Number of outgoing transactions',
    }),
    incomingCount: z.number().openapi({
      example: 25,
      description: 'Number of incoming transactions',
    }),
    windowStart: z.number().nullable().optional().openapi({
      example: 1704067200000,
      description: 'Start of time window in milliseconds (null if all time)',
    }),
    windowEnd: z.number().openapi({
      example: 1704153600000,
      description: 'End of time window in milliseconds',
    }),
  })
  .openapi('AnalyticsSummary');

// =============================================================================
// Transaction Schema
// =============================================================================

export const TransactionSchema = z
  .object({
    id: z.string().optional().openapi({
      example: 'tx_abc123',
      description: 'Transaction ID',
    }),
    groupName: z.string().openapi({
      example: 'payment',
      description: 'Transaction group name',
    }),
    scope: z.string().openapi({
      example: 'entrypoint:echo',
      description: 'Transaction scope',
    }),
    direction: z.enum(['incoming', 'outgoing']).openapi({
      example: 'incoming',
      description: 'Payment direction',
    }),
    amount: z.string().openapi({
      example: '1000000',
      description: 'Amount in base units (6 decimals)',
    }),
    amountUsdc: z.string().openapi({
      example: '1.0',
      description: 'Amount in USDC (formatted)',
    }),
    timestamp: z.number().openapi({
      example: 1704067200000,
      description: 'Timestamp in milliseconds',
    }),
    timestampIso: z.string().openapi({
      example: '2024-01-01T00:00:00.000Z',
      description: 'ISO timestamp string',
    }),
  })
  .openapi('Transaction');

// =============================================================================
// Analytics Query Parameters
// =============================================================================

export const AnalyticsQuerySchema = z.object({
  windowHours: z.coerce.number().int().positive().optional().openapi({
    example: 24,
    description: 'Time window in hours (default: all time)',
  }),
  direction: z.enum(['incoming', 'outgoing']).optional().openapi({
    example: 'incoming',
    description: 'Filter by payment direction',
  }),
});

// =============================================================================
// Get Analytics Summary
// =============================================================================

export const getAnalyticsSummaryRoute = createRoute({
  method: 'get',
  path: '/api/agents/{agentId}/analytics/summary',
  tags: ['Analytics'],
  summary: 'Get analytics summary',
  description: 'Get payment analytics summary for an agent.',
  request: {
    params: AgentIdParamSchema,
    query: AnalyticsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AnalyticsSummarySchema,
        },
      },
      description: 'Analytics summary',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Analytics not available (payments not enabled)',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Agent not found',
    },
  },
});

// =============================================================================
// Get Analytics Transactions
// =============================================================================

export const getAnalyticsTransactionsRoute = createRoute({
  method: 'get',
  path: '/api/agents/{agentId}/analytics/transactions',
  tags: ['Analytics'],
  summary: 'Get analytics transactions',
  description: 'Get payment transaction history for an agent.',
  request: {
    params: AgentIdParamSchema,
    query: AnalyticsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(TransactionSchema),
        },
      },
      description: 'List of transactions',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Analytics not available (payments not enabled)',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Agent not found',
    },
  },
});

// =============================================================================
// Export Analytics CSV
// =============================================================================

export const exportAnalyticsCSVRoute = createRoute({
  method: 'get',
  path: '/api/agents/{agentId}/analytics/export/csv',
  tags: ['Analytics'],
  summary: 'Export analytics as CSV',
  description: 'Export payment analytics data as CSV.',
  request: {
    params: AgentIdParamSchema,
    query: AnalyticsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'text/csv': {
          schema: z.string(),
        },
      },
      description: 'CSV export',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Analytics not available (payments not enabled)',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Agent not found',
    },
  },
});

// =============================================================================
// Export Analytics JSON
// =============================================================================

export const exportAnalyticsJSONRoute = createRoute({
  method: 'get',
  path: '/api/agents/{agentId}/analytics/export/json',
  tags: ['Analytics'],
  summary: 'Export analytics as JSON',
  description: 'Export payment analytics data as JSON.',
  request: {
    params: AgentIdParamSchema,
    query: AnalyticsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            summary: AnalyticsSummarySchema,
            transactions: z.array(TransactionSchema),
          }),
        },
      },
      description: 'JSON export',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Analytics not available (payments not enabled)',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Agent not found',
    },
  },
});

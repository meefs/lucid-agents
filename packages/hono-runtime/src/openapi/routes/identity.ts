import { createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { AgentIdParamSchema, ErrorSchema } from '../schemas';

// =============================================================================
// Identity Registration Result Schema
// =============================================================================

export const IdentityRegistrationResultSchema = z
  .object({
    status: z
      .enum(['registered', 'pending', 'failed', 'not_registered'])
      .openapi({
        example: 'registered',
        description: 'Registration status',
      }),
    agentId: z.string().optional().openapi({
      example: '42',
      description: 'ERC-8004 agent ID (if registered)',
    }),
    owner: z.string().optional().openapi({
      example: '0x1234567890abcdef1234567890abcdef12345678',
      description: 'Owner address (if registered)',
    }),
    tokenURI: z.string().optional().openapi({
      example: 'ipfs://Qm...',
      description: 'Token URI (if registered)',
    }),
    domain: z.string().optional().openapi({
      example: 'api.daydreams.systems',
      description: 'Agent domain used for registration',
    }),
    error: z.string().optional().openapi({
      example: 'Registration failed: insufficient funds',
      description: 'Error message (if failed)',
    }),
  })
  .openapi('IdentityRegistrationResult');

// =============================================================================
// Retry Identity Registration
// =============================================================================

export const retryIdentityRoute = createRoute({
  method: 'post',
  path: '/api/agents/{agentId}/identity/retry',
  tags: ['Identity'],
  summary: 'Retry identity registration',
  description: 'Retry failed ERC-8004 identity registration for an agent.',
  request: {
    params: AgentIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: IdentityRegistrationResultSchema,
        },
      },
      description: 'Identity registration result',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Identity not configured or wallet not available',
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


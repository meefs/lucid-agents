---
'@lucid-agents/payments': patch
'@lucid-agents/types': patch
---

Add comprehensive payment policy enforcement system with config file-based approach and Zod validation. The system enables agents to control spending limits, rate limits, and recipient restrictions when making outbound payments to other agents.

## New Features

### Payment Policy System

The payment policy system provides:

- **Config File-Based Policies**: Payment policies configured via JSON files (`payment-policies.json`)
  - Clean, version-controllable configuration
  - Easy to review and modify
  - Supports complex policy structures

- **Zod Schema Validation**: All policy configurations validated using Zod schemas
  - Type-safe policy definitions
  - Clear error messages for invalid configurations
  - Prevents runtime errors from malformed policies

- **Multiple Policy Groups**: Support for multiple named policy groups, each with independent rules
  - Different policies for different use cases
  - All groups must pass (first violation blocks payment)
  - Flexible policy composition

### Policy Configuration API

Added new `policies` option to payments extension:

```typescript
import { payments, paymentsFromEnv } from '@lucid-agents/payments';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .use(
    payments({
      config: paymentsFromEnv(),
      policies: 'payment-policies.json', // Load policies from file
    })
  )
  .build();
```

### Policy File Format

Policies are defined in `payment-policies.json`:

```json
[
  {
    "name": "Daily Spending Limit",
    "spendingLimits": {
      "global": {
        "maxPaymentUsd": 10.0,
        "maxTotalUsd": 1000.0,
        "windowMs": 86400000
      },
      "perTarget": {
        "https://agent.example.com": {
          "maxTotalUsd": 500.0
        }
      },
      "perEndpoint": {
        "https://agent.example.com/entrypoints/process/invoke": {
          "maxTotalUsd": 100.0
        }
      }
    },
    "allowedRecipients": [
      "https://trusted.example.com",
      "0x1234567890123456789012345678901234567890"
    ],
    "blockedRecipients": ["https://untrusted.example.com"],
    "rateLimits": {
      "maxPayments": 100,
      "windowMs": 3600000
    }
  }
]
```

### Policy Types

#### Spending Limits

Control how much your agent can spend:

- **Per-Request Limits** (`maxPaymentUsd`): Maximum amount per individual payment (stateless check)
- **Total Spending Limits** (`maxTotalUsd`): Maximum total spending across all payments (stateful, tracked in-memory)
- **Time Windows** (`windowMs`): Optional time window for total spending limits (e.g., 86400000ms = 24 hours)

**Three Scopes:**

- **`global`**: Applies to all payments
- **`perTarget`**: Applies per agent URL/domain (intelligent matching)
- **`perEndpoint`**: Applies per specific endpoint URL (most specific)

#### Rate Limiting

Control payment frequency:

- **`maxPayments`**: Maximum number of payments allowed
- **`windowMs`**: Time window in milliseconds
- Scoped per policy group
- In-memory tracking with automatic cleanup

#### Recipient Controls

Whitelist or blacklist specific recipients:

- **`allowedRecipients`**: Array of allowed addresses or domains
- **`blockedRecipients`**: Array of blocked addresses or domains (takes precedence over whitelist)
- Supports both EVM addresses (0x...) and Solana addresses (base58)
- Domain-based matching for flexible URL matching

### Policy Evaluation

- **Multiple Policy Groups**: Support for multiple named policy groups, each with independent rules
- **All Groups Must Pass**: Policies are evaluated in order - first violation blocks the payment
- **Automatic Enforcement**: Policies automatically enforced when using `createRuntimePaymentContext()` for payment-enabled fetch
- **Scope Resolution**: Most specific match wins (endpoint > target > global)
- **Intelligent Matching**: Per-target matching supports full URLs, domains, and case-insensitive matching

### Error Handling

When policies are violated, the wrapped fetch returns a 403 Forbidden response with detailed error messages:

```typescript
const response = await context.fetchWithPayment?.(url);

if (response?.status === 403) {
  const error = await response.json();
  console.error('Policy violation:', error.reason);
  // Example: "Total spending limit exceeded for policy group 'Daily Budget'
  //          at scope 'global'. Current: 950 USDC, Requested: 100 USDC,
  //          Limit: 1000 USDC"
}
```

## Documentation

- **New `docs/PAYMENTS.md`**: Comprehensive payment system documentation with:
  - Policy configuration guide
  - Policy file format with examples
  - API reference
  - Best practices
  - Troubleshooting guide

- **Updated Example**: `packages/core/examples/policy-agent.ts` demonstrates:
  - Policy file loading
  - Policy enforcement in action
  - Handling policy violations
  - Batch processing with policies

- **Example Policy File**: `packages/core/examples/payment-policies.json.example` shows all policy features

## Backward Compatibility

- Policies are **optional** - existing agents without policies continue to work unchanged
- Only agents that want to use policies need to add the `policies` option
- Policy enforcement only occurs when making outbound payments via `createRuntimePaymentContext()`
- Inbound payments (receiving payments) are not affected by policies

## Implementation Details

- **Zod Schema Validation**: All policy configurations validated using Zod schemas (`PaymentPolicyGroupsSchema`)
- **In-Memory Tracking**: Spending and rate limit tracking is in-memory (resets on agent restart)
- **Fast Evaluation**: Policy checks happen before payment - minimal overhead
- **Scope Matching**: Intelligent URL/domain matching for per-target and per-endpoint limits
- **Error Messages**: Human-readable USDC amounts in error messages (e.g., "1.5 USDC" instead of "1500000")

## Notes

- Policy files are loaded from the current working directory by default
- Custom paths can be specified: `policies: 'config/custom-policies.json'`
- Policy validation errors are thrown at startup with detailed messages
- Missing policy files are handled gracefully (policies simply not enforced)
- See `docs/PAYMENTS.md` for complete usage guide and examples

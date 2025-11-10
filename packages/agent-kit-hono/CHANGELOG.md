# @lucid-agents/agent-kit-hono

## 0.2.1

### Patch Changes

- 574e9b0: # Solana Payment Network Support

  This release adds comprehensive support for Solana payment networks across all adapters and templates.

  ## New Features

  ### Solana Network Support
  - **Solana Mainnet** (`solana`) and **Solana Devnet** (`solana-devnet`) are now fully supported for payment receiving
  - Both Hono and TanStack adapters support Solana payments via x402 protocol
  - Agents can now receive payments in SPL USDC tokens on Solana networks

  ### Interactive Network Selection
  - All CLI templates now include an interactive dropdown for network selection:
    - Base Sepolia (EVM testnet)
    - Base (EVM mainnet)
    - Solana Devnet
    - Solana Mainnet
  - Network selection replaces previous text input for better developer experience

  ### CLI Network Flag
  - Added `--network` flag for non-interactive mode
  - Examples:
    - `bunx @lucid-agents/create-agent-kit my-agent --network=solana-devnet`
    - `bunx @lucid-agents/create-agent-kit my-agent --network=solana`
  - Flag skips network prompt and directly sets `PAYMENTS_NETWORK` in generated `.env`

  ## Improvements

  ### Network Validation
  - Added runtime validation in `validatePaymentsConfig()` that dynamically imports supported networks from x402 library
  - Invalid networks (e.g., `solana-mainnet`) are now rejected at configuration time with clear error messages
  - Validation lists all supported networks in error output for better debugging

  ### Documentation
  - Comprehensive Solana setup guide in all README and AGENTS.md files
  - SPL USDC token addresses documented:
    - Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
    - Devnet: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
  - Solana configuration examples for both Hono and TanStack adapters
  - Clarified address format differences: EVM (0x-prefixed) vs Solana (Base58)
  - Explained separation between identity registration (EVM-only) and payment receiving (any network)

  ### Template Schemas
  - Updated all 4 template schemas with network enums
  - Added examples for both EVM and Solana addresses
  - Clarified that payment addresses can be shared across multiple agents
  - Identity template now explains that PRIVATE_KEY is for developer's EVM wallet (identity registration), separate from PAYMENTS_RECEIVABLE_ADDRESS

  ## Testing
  - Added Solana payment tests for Hono adapter (6 tests)
  - Added Solana payment tests for TanStack adapter (6 tests)
  - Added core runtime Solana configuration tests (2 tests)
  - Network validation tests verify unsupported networks are rejected
  - All 114 tests passing

  ## Bug Fixes
  - Fixed CI workflow to run on `master` branch instead of `main`
  - Fixed 4 CLI tests using outdated adapter names (`tanstack` → `tanstack-ui`)
  - Fixed test prompt mock to handle network selection dropdown

  ## Notes

  ### Network Names

  The correct Solana network identifiers per x402 specification are:
  - `solana` - Mainnet (NOT `solana-mainnet`)
  - `solana-devnet` - Devnet
  - `solana-mainnet` - Does not exist in x402
  - `solana-testnet` - Does not exist in x402

  ### Architecture Clarifications
  - **Developer wallet (PRIVATE_KEY)**: EVM wallet used for identity registration and deployment
  - **Payment receiving address**: Can be EVM or Solana, used to receive payments at entrypoints
  - **Agent's own wallet**: Future work (for reputation, validation, agent-to-agent calls)
  - Payment addresses can be shared across multiple agents deployed by the same developer

  Closes #11

- Updated dependencies [574e9b0]
  - @lucid-agents/agent-kit@1.3.1

## 0.2.0

### Minor Changes

- 1509e59: # Major Refactor: Template-Based Architecture with Adapter Support

  This release introduces a comprehensive refactor of the lucid-agents framework to support multiple runtime adapters and a flexible template system.

  ## Critical Bug Fixes

  ### Security Fix: Removed Hardcoded Payment Wallet Address
  - **CRITICAL**: Payment configuration defaults were previously hardcoded to a specific wallet address
  - All payment config fields (`facilitatorUrl`, `payTo`, `network`) are now `undefined` by default
  - This forces explicit configuration and prevents payments from being sent to incorrect wallets
  - Payment-related types are now properly optional: `payTo?: `0x${string}``

  ### Stream Endpoint HTTP Semantics
  - Stream endpoints are now always registered for all entrypoints
  - Returns proper `400 Bad Request` when streaming is not supported (instead of `404 Not Found`)
  - Improves API consistency and allows clients to optimistically try streaming without manifest lookups
  - Better HTTP semantics: 404 = route doesn't exist, 400 = operation not supported

  ### Config Scoping Fix
  - Removed redundant `payments` property from `createAgentApp` return value
  - Removed module-level global `activeInstanceConfig` to prevent state pollution
  - Single source of truth: use `config.payments` directly
  - Fixes issues with multiple agent instances in same process

  ### Additional Fixes
  - Fixed `ResponseInit` TypeScript linter error by using `ConstructorParameters<typeof Response>[1]`
  - Removed all emojis from codebase (added to coding standards)
  - Fixed 3 failing unit tests from previous refactor
  - Updated test assertions for new API patterns

  ## Breaking Changes
  - **Template System**: Templates now use `.template` file extensions to avoid TypeScript compilation errors during development
  - **Adapter Architecture**: Agent creation now requires selecting an adapter (Hono or TanStack Start)
  - **Payment Config API**: Payment defaults are now `undefined` instead of having fallback values (explicit configuration required)
  - **Return Value**: Removed redundant `payments` property from `createAgentApp` return (use `config.payments` instead)

  ## New Features

  ### Multi-Adapter Support
  - **Hono Adapter** (`@lucid-agents/agent-kit-hono`): Traditional HTTP server adapter
  - **TanStack Start Adapter** (`@lucid-agents/agent-kit-tanstack`): Full-stack React framework adapter with:
    - Headless mode (API only)
    - UI mode (full dashboard with wallet integration)

  ### Template System
  - Templates now support multiple adapters
  - Template files use `.template` extension and are processed during scaffolding
  - Support for adapter-specific code injection via placeholders:
    - `{{ADAPTER_IMPORTS}}`
    - `{{ADAPTER_PRE_SETUP}}`
    - `{{ADAPTER_POST_SETUP}}`
    - `{{ADAPTER_ID}}`

  ### Improved Validation
  - Added validation for identity feature configuration
  - Added payment validation in TanStack adapter
  - Better type safety in route handlers (e.g., params.key validation)

  ### CLI Improvements
  - `--adapter` flag to select runtime framework (hono, tanstack-ui, tanstack-headless)
  - Better error messages for adapter compatibility
  - Clear error suggestions when invalid adapter specified

  ## Package Changes

  ### @lucid-agents/create-agent-kit
  - Adapter selection system with support for multiple runtime frameworks
  - Template processing with `.template` file handling
  - Adapter-specific file layering system
  - TanStack adapter available in two variants: `tanstack-ui` (full dashboard) and `tanstack-headless` (API only)
  - Non-interactive mode improvements

  ### @lucid-agents/agent-kit
  - Split into adapter-specific packages
  - Core functionality moved to `@lucid-agents/agent-core`
  - Improved type definitions

  ### @lucid-agents/agent-kit-hono (NEW)
  - Hono-specific runtime implementation
  - Maintains backward compatibility with existing Hono-based agents

  ### @lucid-agents/agent-kit-tanstack (NEW)
  - TanStack Start runtime implementation
  - File-based routing support
  - Payment middleware integration
  - UI and headless variants

  ### @lucid-agents/agent-kit-identity
  - Improved validation
  - Better integration with template system

  ### @lucid-agents/agent-core (NEW)
  - Shared core functionality across adapters
  - Type definitions and utilities

  ## Migration Guide

  Existing projects using Hono will need to update imports:

  ```typescript
  // Before
  import { createAgentApp } from '@lucid-agents/agent-kit';

  // After
  import { createAgentApp } from '@lucid-agents/agent-kit-hono';
  ```

  New projects should specify adapter during creation:

  ```bash
  # Hono adapter
  bunx @lucid-agents/create-agent-kit my-agent --adapter=hono

  # TanStack with UI (full dashboard)
  bunx @lucid-agents/create-agent-kit my-agent --adapter=tanstack-ui

  # TanStack headless (API only)
  bunx @lucid-agents/create-agent-kit my-agent --adapter=tanstack-headless
  ```

### Patch Changes

- Updated dependencies [1509e59]
  - @lucid-agents/agent-kit@1.3.0
  - @lucid-agents/agent-core@0.2.0

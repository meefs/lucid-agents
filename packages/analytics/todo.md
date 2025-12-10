# Analytics Package TODO

## Extension Testing

- [ ] Add integration tests for analytics extension in `packages/core/examples` or similar integration test location
  - Test that analytics is only created when payments are configured with policy groups that require tracking
  - Test that analytics.paymentTracker matches payments.paymentTracker
  - Test that analytics returns undefined when payments aren't configured
  - Test that analytics returns undefined when payments don't have paymentTracker (no policy groups with limits)

## Notes

- Analytics extension should NOT depend on `@lucid-agents/core` or `@lucid-agents/http` - it only needs `@lucid-agents/types`
- Analytics is only useful when payments are configured with policy groups that create a paymentTracker
- Extension tests should be integration tests, not unit tests in the analytics package itself


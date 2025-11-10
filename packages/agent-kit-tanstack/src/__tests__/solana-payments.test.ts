import { describe, expect, it } from 'bun:test';
import type { PaymentsConfig } from '@lucid-agents/agent-kit';
import { createTanStackPaywall } from '../paywall';
import type { RoutesConfig } from 'x402/types';

describe('TanStack Solana Payments', () => {
  const solanaPayments: PaymentsConfig = {
    payTo: '9yPGxVrYi7C5JLMGjEZhK8qQ4tn7SzMWwQHvz3vGJCKz', // Solana Base58 address
    facilitatorUrl: 'https://facilitator.test',
    network: 'solana-devnet',
    defaultPrice: '10000',
  };

  const entrypoints = [
    {
      key: 'translate',
      description: 'Translate text',
      input: undefined,
      output: undefined,
      price: '5000',
    },
    {
      key: 'generate',
      description: 'Generate content',
      input: undefined,
      stream: async () => ({ status: 'succeeded' as const }),
      price: { invoke: '2000', stream: '8000' },
    },
  ];

  function createRuntime(paymentsConfig?: PaymentsConfig) {
    return {
      payments: paymentsConfig,
      snapshotEntrypoints: () => entrypoints,
    } as const;
  }

  // Note: These tests validate route configuration but do not test middleware execution.
  // Actual payment verification happens in x402 library and would require:
  // - Mocking facilitator's supported() call
  // - Creating full HTTP request/response cycle
  // - Mocking payment signature validation
  // The core validation logic is in @lucid-agents/x402-tanstack-start (lines 143-179)

  it('creates paywall middleware for Solana network', () => {
    const runtime = createRuntime(solanaPayments);
    const capturedRoutes: RoutesConfig[] = [];

    const middlewareFactory = ((_payTo, _routes, _facilitator, _paywall) => {
      return (() =>
        Promise.resolve(new Response())) as TanStackRequestMiddleware;
    }) satisfies typeof import('@lucid-agents/x402-tanstack-start').paymentMiddleware;

    const spyingFactory: typeof middlewareFactory = (
      payTo,
      routes,
      facilitator
    ) => {
      capturedRoutes.push(routes as RoutesConfig);
      expect(payTo).toBe(solanaPayments.payTo);
      expect(facilitator?.url).toBe(solanaPayments.facilitatorUrl);
      return middlewareFactory(payTo, routes, facilitator);
    };

    const paywall = createTanStackPaywall({
      runtime,
      basePath: '/api/agent',
      middlewareFactory: spyingFactory,
    });

    expect(paywall.invoke).toBeDefined();
    expect(paywall.stream).toBeDefined();
    expect(capturedRoutes.length).toBe(2); // invoke and stream routes

    const [invokeRoutes, streamRoutes] = capturedRoutes;

    // Verify invoke routes
    expect(Object.keys(invokeRoutes)).toContain(
      'POST /api/agent/entrypoints/translate/invoke'
    );
    expect(Object.keys(invokeRoutes)).toContain(
      'GET /api/agent/entrypoints/translate/invoke'
    );

    // Verify route configuration includes Solana network
    const translateInvokeConfig =
      invokeRoutes['POST /api/agent/entrypoints/translate/invoke'];
    expect(translateInvokeConfig.network).toBe('solana-devnet');
    expect(translateInvokeConfig.price).toBe('5000');

    // Verify stream routes
    expect(Object.keys(streamRoutes)).toContain(
      'POST /api/agent/entrypoints/generate/stream'
    );

    const generateStreamConfig =
      streamRoutes['POST /api/agent/entrypoints/generate/stream'];
    expect(generateStreamConfig.network).toBe('solana-devnet');
    expect(generateStreamConfig.price).toBe('8000');
  });

  it('accepts Solana Base58 address format', () => {
    const validSolanaAddresses = [
      '9yPGxVrYi7C5JLMGjEZhK8qQ4tn7SzMWwQHvz3vGJCKz',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    ];

    validSolanaAddresses.forEach(address => {
      const config: PaymentsConfig = {
        payTo: address,
        facilitatorUrl: 'https://facilitator.test',
        network: 'solana',
        defaultPrice: '1000',
      };

      const runtime = createRuntime(config);
      const paywall = createTanStackPaywall({ runtime });

      expect(paywall.invoke).toBeDefined();
      expect(paywall.stream).toBeDefined();
    });
  });

  it('supports both Solana mainnet and devnet', () => {
    const networks = [
      { value: 'solana', name: 'mainnet' },
      { value: 'solana-devnet', name: 'devnet' },
    ] as const;

    networks.forEach(({ value: network, name }) => {
      const config: PaymentsConfig = {
        ...solanaPayments,
        network,
      };

      const runtime = createRuntime(config);
      const capturedRoutes: RoutesConfig[] = [];

      const middlewareFactory = ((_payTo, _routes, _facilitator, _paywall) => {
        return (() => Promise.resolve(new Response())) as any;
      }) satisfies typeof import('@lucid-agents/x402-tanstack-start').paymentMiddleware;

      const spyingFactory: typeof middlewareFactory = (
        payTo,
        routes,
        facilitator
      ) => {
        capturedRoutes.push(routes as RoutesConfig);
        return middlewareFactory(payTo, routes, facilitator);
      };

      const paywall = createTanStackPaywall({
        runtime,
        middlewareFactory: spyingFactory,
      });

      expect(paywall.invoke).toBeDefined();

      const [invokeRoutes] = capturedRoutes;
      const routeKeys = Object.keys(invokeRoutes);
      expect(routeKeys.length).toBeGreaterThan(0);

      // Verify all routes use the correct Solana network
      for (const key of routeKeys) {
        const routeConfig = invokeRoutes[key];
        expect(routeConfig.network).toBe(network);
      }
    });
  });

  it('builds correct route paths with Solana payments', () => {
    const runtime = createRuntime(solanaPayments);
    const capturedRoutes: RoutesConfig[] = [];

    const middlewareFactory = ((_payTo, _routes, _facilitator, _paywall) => {
      return (() =>
        Promise.resolve(new Response())) as TanStackRequestMiddleware;
    }) satisfies typeof import('@lucid-agents/x402-tanstack-start').paymentMiddleware;

    const spyingFactory: typeof middlewareFactory = (
      payTo,
      routes,
      facilitator
    ) => {
      capturedRoutes.push(routes as RoutesConfig);
      return middlewareFactory(payTo, routes, facilitator);
    };

    createTanStackPaywall({
      runtime,
      basePath: '/api/agent',
      middlewareFactory: spyingFactory,
    });

    const [invokeRoutes, streamRoutes] = capturedRoutes;

    // Verify invoke routes include both POST and GET
    expect(Object.keys(invokeRoutes)).toContain(
      'POST /api/agent/entrypoints/translate/invoke'
    );
    expect(Object.keys(invokeRoutes)).toContain(
      'GET /api/agent/entrypoints/translate/invoke'
    );

    // Verify stream routes only include entrypoints with stream handler
    expect(Object.keys(streamRoutes)).not.toContain(
      'POST /api/agent/entrypoints/translate/stream'
    );
    expect(Object.keys(streamRoutes)).toContain(
      'POST /api/agent/entrypoints/generate/stream'
    );
  });

  it('uses correct price for Solana entrypoints', () => {
    const runtime = createRuntime(solanaPayments);
    const capturedRoutes: RoutesConfig[] = [];

    const middlewareFactory = ((_payTo, _routes, _facilitator, _paywall) => {
      return (() =>
        Promise.resolve(new Response())) as TanStackRequestMiddleware;
    }) satisfies typeof import('@lucid-agents/x402-tanstack-start').paymentMiddleware;

    const spyingFactory: typeof middlewareFactory = (
      payTo,
      routes,
      facilitator
    ) => {
      capturedRoutes.push(routes as RoutesConfig);
      return middlewareFactory(payTo, routes, facilitator);
    };

    createTanStackPaywall({
      runtime,
      middlewareFactory: spyingFactory,
    });

    const [invokeRoutes, streamRoutes] = capturedRoutes;

    // Check invoke price for translate (explicit price)
    const translateInvokeConfig =
      invokeRoutes['POST /api/agent/entrypoints/translate/invoke'];
    expect(translateInvokeConfig.price).toBe('5000');

    // Check invoke price for generate (from price.invoke)
    const generateInvokeConfig =
      invokeRoutes['POST /api/agent/entrypoints/generate/invoke'];
    expect(generateInvokeConfig.price).toBe('2000');

    // Check stream price for generate (from price.stream)
    const generateStreamConfig =
      streamRoutes['POST /api/agent/entrypoints/generate/stream'];
    expect(generateStreamConfig.price).toBe('8000');
  });

  it('rejects unsupported network at configuration time', () => {
    const invalidPayments: PaymentsConfig = {
      payTo: '9yPGxVrYi7C5JLMGjEZhK8qQ4tn7SzMWwQHvz3vGJCKz',
      facilitatorUrl: 'https://facilitator.test',
      network: 'solana-mainnet' as any, // Invalid - should be 'solana'
      defaultPrice: '10000',
    };

    const runtime = createRuntime(invalidPayments);

    // Should throw when creating paywall with invalid network
    expect(() => {
      createTanStackPaywall({ runtime });
    }).toThrow(/Unsupported payment network: solana-mainnet/);
  });
});

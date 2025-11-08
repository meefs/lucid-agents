import { paymentMiddleware } from "x402-hono";
import type { FacilitatorConfig } from "x402/types";
import type { EntrypointDef, PaymentsConfig } from "./types";
import { resolveEntrypointPrice } from "./pricing";
import { toJsonSchemaOrUndefined } from "./utils";

type PaymentMiddlewareFactory = typeof paymentMiddleware;

/**
 * Validates payment configuration and throws descriptive errors if invalid.
 * @param payments - Payment configuration to validate
 * @param network - Network configuration (may be from entrypoint or payments)
 * @param entrypointKey - Entrypoint key for error messages
 * @throws Error if required payment configuration is missing
 */
function validatePaymentsConfig(
  payments: PaymentsConfig,
  network: string | undefined,
  entrypointKey: string
): void {
  if (!payments.payTo) {
    console.error(
      `[agent-kit] Payment configuration error for entrypoint "${entrypointKey}":`,
      "PAYMENTS_RECEIVABLE_ADDRESS is not set.",
      "Please set the environment variable or configure payments.payTo in your agent setup."
    );
    throw new Error(
      `Payment configuration error: PAYMENTS_RECEIVABLE_ADDRESS environment variable is not set. ` +
        `This is required to receive payments. Please set PAYMENTS_RECEIVABLE_ADDRESS to your wallet address.`
    );
  }

  if (!payments.facilitatorUrl) {
    console.error(
      `[agent-kit] Payment configuration error for entrypoint "${entrypointKey}":`,
      "FACILITATOR_URL is not set.",
      "Please set the environment variable or configure payments.facilitatorUrl."
    );
    throw new Error(
      `Payment configuration error: FACILITATOR_URL environment variable is not set. ` +
        `This is required for payment processing.`
    );
  }

  if (!network) {
    console.error(
      `[agent-kit] Payment configuration error for entrypoint "${entrypointKey}":`,
      "NETWORK is not set.",
      "Please set the NETWORK environment variable or configure payments.network."
    );
    throw new Error(
      `Payment configuration error: NETWORK environment variable is not set. ` +
        `This is required to specify which blockchain network to use for payments (e.g., 'base-sepolia', 'base', 'ethereum').`
    );
  }
}

export type WithPaymentsParams = {
  app: { use: (path: string, ...handlers: unknown[]) => void };
  path: string;
  entrypoint: EntrypointDef;
  kind: "invoke" | "stream";
  payments?: PaymentsConfig;
  facilitator?: FacilitatorConfig;
  middlewareFactory?: PaymentMiddlewareFactory;
};

export function withPayments({
  app,
  path,
  entrypoint,
  kind,
  payments,
  facilitator,
  middlewareFactory = paymentMiddleware,
}: WithPaymentsParams): boolean {
  if (!payments) return false;

  const network = entrypoint.network ?? payments.network;
  const price = resolveEntrypointPrice(entrypoint, payments, kind);

  validatePaymentsConfig(payments, network, entrypoint.key);

  if (!price) return false;
  const requestSchema = toJsonSchemaOrUndefined(entrypoint.input);
  const responseSchema = toJsonSchemaOrUndefined(entrypoint.output);

  const description =
    entrypoint.description ??
    `${entrypoint.key}${kind === "stream" ? " (stream)" : ""}`;
  const postMimeType =
    kind === "stream" ? "text/event-stream" : "application/json";
  const inputSchema = {
    bodyType: "json" as const,
    ...(requestSchema ? { bodyFields: { input: requestSchema } } : {}),
  };
  const outputSchema =
    kind === "invoke" && responseSchema
      ? { output: responseSchema }
      : undefined;

  const resolvedFacilitator: FacilitatorConfig =
    facilitator ??
    ({ url: payments.facilitatorUrl } satisfies FacilitatorConfig);

  const postRoute = {
    price,
    network,
    config: {
      description,
      mimeType: postMimeType,
      discoverable: true,
      inputSchema,
      outputSchema,
    },
  };

  const getRoute = {
    price,
    network,
    config: {
      description,
      mimeType: "application/json",
      discoverable: true,
      inputSchema,
      outputSchema,
    },
  };

  app.use(
    path,
    middlewareFactory(
      payments.payTo,
      {
        [`POST ${path}`]: postRoute,
        [`GET ${path}`]: getRoute,
      },
      resolvedFacilitator
    )
  );
  return true;
}

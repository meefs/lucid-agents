import type { Hono } from 'hono';
import { paymentMiddleware } from 'x402-hono';
import type { FacilitatorConfig } from 'x402/types';
import type { EntrypointDef, PaymentsConfig } from '@lucid-agents/agent-kit';
type PaymentMiddlewareFactory = typeof paymentMiddleware;
export type WithPaymentsParams = {
    app: Hono;
    path: string;
    entrypoint: EntrypointDef;
    kind: 'invoke' | 'stream';
    payments?: PaymentsConfig;
    facilitator?: FacilitatorConfig;
    middlewareFactory?: PaymentMiddlewareFactory;
};
export declare function withPayments({ app, path, entrypoint, kind, payments, facilitator, middlewareFactory, }: WithPaymentsParams): boolean;
export {};

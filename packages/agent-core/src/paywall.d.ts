import type { EntrypointDef, PaymentsConfig } from "./types";
export type PaywallContext = {
    request: {
        method: string;
        url: string;
        headers: Headers;
        body?: unknown;
    };
    entrypoint: EntrypointDef;
    payments: PaymentsConfig;
    kind: "invoke" | "stream";
};
export type PaywallResult = {
    ok: true;
} | {
    ok: false;
    status: number;
    body: unknown;
};
export declare function validatePayment(ctx: PaywallContext): Promise<PaywallResult>;

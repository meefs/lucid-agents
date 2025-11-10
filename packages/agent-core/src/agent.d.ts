import { z } from "zod";
import type { AgentConfig, EntrypointDef, PaymentsConfig, StreamResult, Usage } from "./types";
export type InvokeContext = {
    signal: AbortSignal;
    headers: Headers;
    runId?: string;
};
export type StreamContext = InvokeContext;
export type InvokeResult = {
    output: unknown;
    usage?: Usage;
    model?: string;
};
export declare class AgentCore {
    readonly config: AgentConfig;
    private entrypoints;
    constructor(config: AgentConfig);
    addEntrypoint(entrypoint: EntrypointDef): void;
    getEntrypoint(key: string): EntrypointDef | undefined;
    listEntrypoints(): EntrypointDef[];
    resolveManifest(origin: string, basePath?: string): {
        name: string;
        version: string;
        description: string;
        icon: string;
        entrypoints: {
            key: string;
            description: string;
            url: string;
            streamUrl: string;
            input: z.core.JSONSchema.JSONSchema;
            output: z.core.JSONSchema.JSONSchema;
            price: string | {
                invoke?: string;
                stream?: string;
            };
            network: string;
        }[];
    };
    invoke(key: string, input: unknown, ctx: InvokeContext): Promise<InvokeResult>;
    stream(key: string, input: unknown, emit: Parameters<NonNullable<EntrypointDef["stream"]>>[1], ctx: StreamContext): Promise<StreamResult>;
    private parseInput;
    private parseOutput;
    private getEntrypointOrThrow;
}
export declare class ZodValidationError extends Error {
    readonly kind: "input" | "output";
    readonly issues: z.ZodError["issues"];
    constructor(kind: "input" | "output", issues: z.ZodError["issues"]);
}
export declare function createAgentCore(config: AgentConfig): AgentCore;
export declare function resolveEntrypointPrice(entrypoint: EntrypointDef, payments: PaymentsConfig | undefined, kind: "invoke" | "stream"): string | undefined;

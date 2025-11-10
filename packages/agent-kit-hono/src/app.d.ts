import { Hono } from 'hono';
import type { AgentMeta, EntrypointDef } from '@lucid-agents/agent-kit';
import { type CreateAgentHttpOptions } from '@lucid-agents/agent-kit';
export type CreateAgentAppOptions = CreateAgentHttpOptions & {
    /**
     * Hook called before mounting agent routes.
     * Use this to register custom middleware that should run before agent handlers.
     */
    beforeMount?: (app: Hono) => void;
    /**
     * Hook called after mounting all agent routes.
     * Use this to register additional custom routes or error handlers.
     */
    afterMount?: (app: Hono) => void;
};
export declare function createAgentApp(meta: AgentMeta, opts?: CreateAgentAppOptions): {
    app: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
    agent: import("@lucid-agents/agent-core").AgentCore;
    addEntrypoint: (def: EntrypointDef) => void;
    config: import("@lucid-agents/agent-kit").ResolvedAgentKitConfig;
};

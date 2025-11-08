import { z } from "zod";
import {
  AgentKitConfig,
  createAgentApp,
  createAxLLMClient,
} from "@lucid-agents/agent-kit";
import { flow } from "@ax-llm/ax";

const axClient = createAxLLMClient({
  logger: {
    warn(message, error) {
      if (error) {
        console.warn(`[examples] ${message}`, error);
      } else {
        console.warn(`[examples] ${message}`);
      }
    },
  },
});

const configOverrides: AgentKitConfig = {
  payments: {
    facilitatorUrl:
      (process.env.PAYMENTS_FACILITATOR_URL as any) ??
      "https://facilitator.daydreams.systems",
    payTo:
      (process.env.PAYMENTS_RECEIVABLE_ADDRESS as `0x${string}`) ??
      "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429",
    network: (process.env.NETWORK as any) ?? "base",
    defaultPrice: process.env.DEFAULT_PRICE ?? "0.1",
  },
};

const { app, addEntrypoint } = createAgentApp(
  {
    name: process.env.AGENT_NAME,
    version: process.env.AGENT_VERSION,
    description: process.env.AGENT_DESCRIPTION,
  },
  {
    config: configOverrides,
    useConfigPayments: true,
  }
);

addEntrypoint({
  key: "echo",
  description: "Echo input text",
  input: z.object({
    text: z.string().min(1, "Please provide some text."),
  }),
  handler: async ({ input }) => {
    return {
      output: {
        text: input.text,
      },
    };
  },
});

export { app };

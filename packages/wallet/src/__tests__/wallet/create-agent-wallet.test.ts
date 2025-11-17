import { afterEach, describe, expect, it, mock } from "bun:test";

import { LocalEoaWalletConnector } from '../../local-eoa-connector';
import { ServerOrchestratorWalletConnector } from '../../server-orchestrator-connector';
import { createAgentWallet } from '../../create-agent-wallet';

describe("createAgentWallet", () => {
  afterEach(() => {
    mock.restore();
  });

  it("builds a local wallet from a private key", async () => {
    const handle = createAgentWallet({
      type: "local",
      privateKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      caip2: "eip155:8453",
    });

    expect(handle.kind).toBe("local");
    expect(handle.connector).toBeInstanceOf(LocalEoaWalletConnector);

    const address = await handle.connector.getAddress?.();
    expect(address).toBeTruthy();
    expect(address).toMatch(/^0x[a-f0-9]{40}$/i);
  });

  it("builds a lucid wallet backed by the orchestrator", async () => {
    const fetch = mock(async () => new Response(null, { status: 401 }));
    const handle = createAgentWallet({
      type: "lucid",
      baseUrl: "https://lucid.example",
      agentRef: "agent-123",
      fetch,
      accessToken: "token",
    });

    expect(handle.kind).toBe("lucid");
    expect(handle.connector).toBeInstanceOf(ServerOrchestratorWalletConnector);
    expect(typeof handle.setAccessToken).toBe("function");
  });
});


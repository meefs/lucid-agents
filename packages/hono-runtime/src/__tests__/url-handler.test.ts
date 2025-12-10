import { describe, expect, it, mock } from 'bun:test';
import { createUrlHandler } from '../handlers/url';
import type { HandlerContext } from '../handlers/types';

const baseCtx: Omit<HandlerContext, 'input'> = {
  agentId: 'ag_test',
  entrypointKey: 'url-ep',
  sessionId: 'sess',
  requestId: 'req',
  metadata: {},
};

describe('url handler', () => {
  it('rejects disallowed host', async () => {
    const handler = createUrlHandler({
      url: 'https://blocked.example.com/path',
      allowedHosts: ['allowed.example.com'],
      timeoutMs: 500,
    });

    await expect(handler({ ...baseCtx, input: null })).rejects.toThrow(
      /Host not allowed/
    );
  });

  it('fetches allowed host and returns JSON', async () => {
    const fetchMock = mock(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    // @ts-expect-error - override global fetch in test
    const originalFetch = global.fetch;
    // @ts-expect-error - override global fetch in test
    global.fetch = fetchMock;

    const handler = createUrlHandler({
      url: 'https://allowed.example.com/data',
      allowedHosts: ['allowed.example.com'],
    });

    const res = await handler({ ...baseCtx, input: null });

    expect(fetchMock.mock.calls.length).toBe(1);
    expect(res.output).toEqual({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { ok: true },
    });

    // @ts-expect-error - restore
    global.fetch = originalFetch;
  });
});


import { describe, expect, it } from 'bun:test';
import { createJsHandler } from '../handlers/js';
import type { HandlerContext } from '../handlers/types';

const baseCtx: Omit<HandlerContext, 'input'> = {
  agentId: 'ag_test',
  entrypointKey: 'js-ep',
  sessionId: 'sess',
  requestId: 'req',
  metadata: {},
};

describe('js handler', () => {
  it('returns output from inline code', async () => {
    const handler = createJsHandler({ code: 'return input;' });

    const result = await handler({ ...baseCtx, input: { hello: 'world' } });
    expect(result.output).toEqual({ hello: 'world' });
  });

  it('blocks disallowed hosts', async () => {
    const handler = createJsHandler({
      code: 'return await fetch(\"https://blocked.test\");',
      network: { allowedHosts: ['example.com'], timeoutMs: 500 },
      timeoutMs: 500,
    });

    await expect(handler({ ...baseCtx, input: null })).rejects.toThrow(
      /Host not allowed/
    );
  });
});

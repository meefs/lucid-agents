import type { HandlerContext, HandlerFn } from './types';
import { executeJs } from '../runtime/js-executor';

interface JsNetworkConfig {
  allowedHosts: string[];
  timeoutMs?: number;
}

interface JsHandlerConfig {
  code: string;
  timeoutMs?: number;
  network?: JsNetworkConfig;
}

const DEFAULT_EXECUTION_TIMEOUT_MS = 1000;
const DEFAULT_NETWORK_TIMEOUT_MS = 1000;

function normalizeConfig(config: unknown): JsHandlerConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid js handler config');
  }

  const typed = config as Partial<JsHandlerConfig>;

  if (!typed.code || typeof typed.code !== 'string') {
    throw new Error('js handler requires code');
  }

  const timeoutMs = typeof typed.timeoutMs === 'number' ? typed.timeoutMs : undefined;

  let network: JsNetworkConfig | undefined;
  if (typed.network) {
    const net = typed.network as JsNetworkConfig;
    if (!Array.isArray(net.allowedHosts) || net.allowedHosts.length === 0) {
      throw new Error('network.allowedHosts must be a non-empty array when provided');
    }
    network = {
      allowedHosts: net.allowedHosts,
      timeoutMs:
        typeof net.timeoutMs === 'number' && net.timeoutMs > 0
          ? net.timeoutMs
          : DEFAULT_NETWORK_TIMEOUT_MS,
    };
  }

  return {
    code: typed.code,
    timeoutMs,
    network,
  } satisfies JsHandlerConfig;
}

export function createJsHandler(config: unknown): HandlerFn {
  const cfg = normalizeConfig(config);

  return async function jsHandler(ctx: HandlerContext) {
    const result = await executeJs({
      code: cfg.code,
      input: ctx.input,
      timeoutMs: cfg.timeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS,
      network: cfg.network,
    });

    return {
      output: result,
      usage: { total_tokens: 0 },
    };
  };
}


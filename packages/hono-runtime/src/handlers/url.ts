import type { HandlerContext, HandlerFn } from './types';

interface UrlHandlerConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  allowedHosts: string[];
}

const DEFAULT_URL_TIMEOUT_MS = 1000;

function normalizeConfig(config: unknown): UrlHandlerConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid url handler config');
  }

  const typed = config as Partial<UrlHandlerConfig>;

  if (!typed.url || typeof typed.url !== 'string') {
    throw new Error('url handler requires url');
  }

  if (!typed.allowedHosts || !Array.isArray(typed.allowedHosts) || typed.allowedHosts.length === 0) {
    throw new Error('url handler requires allowedHosts');
  }

  const method = typed.method && typed.method.toUpperCase() === 'POST' ? 'POST' : 'GET';

  return {
    url: typed.url,
    method,
    headers: typed.headers,
    body: typed.body,
    timeoutMs: typed.timeoutMs,
    allowedHosts: typed.allowedHosts,
  };
}

export function createUrlHandler(config: unknown): HandlerFn {
  const cfg = normalizeConfig(config);
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_URL_TIMEOUT_MS;
  const allowAnyHost = cfg.allowedHosts.includes('*');

  return async function urlHandler(ctx: HandlerContext) {
    const target = new URL(cfg.url);
    if (!allowAnyHost && !cfg.allowedHosts.includes(target.hostname)) {
      throw new Error(`Host not allowed: ${target.hostname}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('request-timeout'), timeoutMs);

    try {
      const init: RequestInit = {
        method: cfg.method,
        headers: cfg.headers,
        signal: controller.signal,
      };

      if (cfg.method === 'POST' && cfg.body !== undefined) {
        init.body = JSON.stringify(cfg.body);
        init.headers = { ...(init.headers || {}), 'Content-Type': 'application/json' };
      }

      const res = await fetch(target.toString(), init);
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const body = isJson ? await res.json() : await res.text();

      return {
        output: {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body,
        },
        usage: { total_tokens: 0 },
      };
    } finally {
      clearTimeout(timer);
    }
  };
}


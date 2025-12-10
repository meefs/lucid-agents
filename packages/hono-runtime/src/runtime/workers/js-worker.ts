import { parentPort, workerData } from 'node:worker_threads';
import vm from 'node:vm';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';

interface WorkerData {
  code: string;
  input: unknown;
  timeoutMs: number;
  network?: {
    allowedHosts: string[];
    timeoutMs?: number;
  };
}

function createFetchProxy(allowedHosts: string[], timeoutMs: number) {
  if (typeof fetch !== 'function') return undefined;

  return async function guardedFetch(input: any, init?: any) {
    const url = typeof input === 'string' ? new URL(input) : new URL(String(input));
    if (!allowedHosts.includes(url.hostname)) {
      throw new Error(`Host not allowed: ${url.hostname}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('network-timeout'), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

async function run() {
  const { code, input, timeoutMs, network } = workerData as WorkerData;

  const sandbox: Record<string, unknown> = {
    input,
    console,
    setTimeout: undefined,
    setInterval: undefined,
  };

  if (network && network.allowedHosts?.length) {
    const netTimeout = typeof network.timeoutMs === 'number' ? network.timeoutMs : 1000;
    sandbox.fetch = createFetchProxy(network.allowedHosts, netTimeout);
  }

  const context = vm.createContext(sandbox, { name: 'js-handler-context' });

  try {
    const wrapped = `(async () => {\n${code}\n})()`;
    const script = new vm.Script(wrapped);
    const result = await Promise.race([
      script.runInContext(context, { timeout: timeoutMs }),
      setTimeoutPromise(timeoutMs, null, { ref: false }).then(() => {
        throw new Error('Execution timed out');
      }),
    ]);

    parentPort?.postMessage({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    parentPort?.postMessage({ ok: false, error: message });
  }
}

run();

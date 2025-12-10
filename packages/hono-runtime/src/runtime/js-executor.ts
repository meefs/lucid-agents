import { Worker } from 'node:worker_threads';

interface JsExecutorOptions {
  code: string;
  input: unknown;
  timeoutMs: number;
  network?: {
    allowedHosts: string[];
    timeoutMs?: number;
  };
}

interface WorkerMessage {
  ok: boolean;
  result?: unknown;
  error?: string;
}

const workerUrl = new URL('./workers/js-worker.js', import.meta.url);

export async function executeJs(opts: JsExecutorOptions): Promise<unknown> {
  const { code, input, timeoutMs, network } = opts;

  return new Promise((resolvePromise, rejectPromise) => {
    const worker = new Worker(workerUrl, {
      workerData: { code, input, timeoutMs, network },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
        stackSizeMb: 4,
      },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      rejectPromise(new Error('JS execution timed out'));
    }, timeoutMs + 50);

    worker.once('message', (msg: WorkerMessage) => {
      clearTimeout(timeout);
      if (msg.ok) {
        resolvePromise(msg.result);
      } else {
        rejectPromise(new Error(msg.error ?? 'JS execution failed'));
      }
    });

    worker.once('error', err => {
      clearTimeout(timeout);
      rejectPromise(err);
    });

    worker.once('exit', codeExit => {
      if (codeExit !== 0) {
        clearTimeout(timeout);
        rejectPromise(new Error(`JS worker exited with code ${codeExit}`));
      }
    });
  });
}

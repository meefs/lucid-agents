import type { HandlerFn, BuiltinHandlerConfig } from './types';
import { builtinHandlers } from './builtins';

/**
 * Error thrown when a handler cannot be found
 */
export class HandlerNotFoundError extends Error {
  constructor(type: string, name?: string) {
    const msg = name
      ? `Handler not found: ${type}/${name}`
      : `Unknown handler type: ${type}`;
    super(msg);
    this.name = 'HandlerNotFoundError';
  }
}

/**
 * Registry for handler functions.
 *
 * In MVP, only builtin handlers are supported.
 * Future versions will add LLM, graph, webhook handlers.
 */
export class HandlerRegistry {
  private builtins: Map<string, HandlerFn>;
  private jsFactory?: (config: unknown) => HandlerFn;
  private urlFactory?: (config: unknown) => HandlerFn;

  constructor() {
    this.builtins = new Map(Object.entries(builtinHandlers));
  }

  /** Register the JS handler factory */
  registerJsFactory(factory: (config: unknown) => HandlerFn): void {
    this.jsFactory = factory;
  }

  /** Register the URL handler factory */
  registerUrlFactory(factory: (config: unknown) => HandlerFn): void {
    this.urlFactory = factory;
  }

  /**
   * Register a custom builtin handler
   */
  registerBuiltin(name: string, handler: HandlerFn): void {
    this.builtins.set(name, handler);
  }

  /**
   * Get a builtin handler by name
   */
  getBuiltin(name: string): HandlerFn | undefined {
    return this.builtins.get(name);
  }

  /**
   * List all registered builtin handler names
   */
  listBuiltins(): string[] {
    return Array.from(this.builtins.keys());
  }

  /**
   * Resolve a handler based on type and config.
   *
   * @throws {HandlerNotFoundError} if handler cannot be resolved
   */
  resolveHandler(handlerType: string, handlerConfig: unknown): HandlerFn {
    if (handlerType === 'builtin') {
      const config = handlerConfig as BuiltinHandlerConfig;
      const handler = this.getBuiltin(config.name);

      if (!handler) {
        throw new HandlerNotFoundError('builtin', config.name);
      }

      return handler;
    }

    if (handlerType === 'js') {
      if (!this.jsFactory) {
        throw new HandlerNotFoundError('js');
      }
      return this.jsFactory(handlerConfig);
    }

    if (handlerType === 'url') {
      if (!this.urlFactory) {
        throw new HandlerNotFoundError('url');
      }
      return this.urlFactory(handlerConfig);
    }

    // Future: add 'llm', 'graph', 'webhook', 'tool-call' handlers
    throw new HandlerNotFoundError(handlerType);
  }
}

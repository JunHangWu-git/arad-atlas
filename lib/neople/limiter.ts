import "server-only";

/**
 * Token-bucket rate limiter. Caps outbound request rate to stay under the
 * Neople API ceiling. Default ceiling is 50 req/sec (Neople's published cap).
 */

export interface LimiterOptions {
  readonly ratePerSec?: number;
}

export interface Limiter {
  /** Resolves once a token is available, consuming one token. */
  acquire(): Promise<void>;
}

const DEFAULT_RATE_PER_SEC = 50;

export function createLimiter(opts?: LimiterOptions): Limiter {
  const ratePerSec =
    opts?.ratePerSec && opts.ratePerSec > 0 ? opts.ratePerSec : DEFAULT_RATE_PER_SEC;
  const capacity = ratePerSec;
  const refillPerMs = ratePerSec / 1000;

  let tokens = capacity;
  let lastRefill = Date.now();

  const refill = (): void => {
    const now = Date.now();
    const elapsed = now - lastRefill;
    if (elapsed > 0) {
      tokens = Math.min(capacity, tokens + elapsed * refillPerMs);
      lastRefill = now;
    }
  };

  const acquire = async (): Promise<void> => {
    for (;;) {
      refill();
      if (tokens >= 1) {
        tokens -= 1;
        return;
      }
      // Wait until at least one token would be available.
      const deficit = 1 - tokens;
      const waitMs = Math.ceil(deficit / refillPerMs);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }
  };

  return { acquire };
}

/** Shared default limiter used by the Neople client. */
export const defaultLimiter: Limiter = createLimiter();

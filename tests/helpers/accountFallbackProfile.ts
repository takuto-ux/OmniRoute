// Shared helpers for the accountFallback unit suites.
//
// Extracted from tests/unit/account-fallback-service.test.ts so that suite stays
// inside its frozen size in config/quality/file-size-baseline.json. Behaviour is
// unchanged; the sibling account-fallback suites can reuse these instead of
// re-declaring their own copies.

/** Build a full ProviderProfile from partial overrides (test helper). */
export function makeProfile(overrides: Record<string, unknown> = {}): any {
  return {
    baseCooldownMs: 125,
    useUpstreamRetryHints: false,
    maxBackoffSteps: 3,
    failureThreshold: 60,
    resetTimeoutMs: 5000,
    transientCooldown: 125,
    rateLimitCooldown: 125,
    maxBackoffLevel: 3,
    circuitBreakerThreshold: 60,
    circuitBreakerReset: 5000,
    providerFailureThreshold: 5,
    providerFailureWindowMs: 300000,
    providerCooldownMs: 60000,
    ...overrides,
  };
}

export function withMockedNow(now, fn) {
  const originalNow = Date.now;
  Date.now = () => now;
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

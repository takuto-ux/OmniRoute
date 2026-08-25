// Signal and pattern tables for accountFallback.ts.
//
// Extracted verbatim from accountFallback.ts (no behaviour change) so the parent
// module stays under its frozen size in config/quality/file-size-baseline.json.
// Every table keeps its original comments — they carry the issue numbers that
// justify each entry, which is why these lists are not "just data".

// Provider-level failure tracking for circuit breaker behavior
// Error codes that count toward provider-level failure threshold.
// 429 is included: per-error-type cooldowns (rate_limit: 60s, quota_exhausted: 1h)
// prevent cascading provider trips at scale (Issue #1846 concern addressed),
// while still allowing the circuit breaker to open on sustained 429s and
// prevent infinite combo retries (Issue #3200).
export const PROVIDER_FAILURE_ERROR_CODES = new Set([408, 429, 500, 502, 503, 504]);

// T06 (sub2api PR #1037): Signals that indicate permanent account deactivation.
// When a 401 body contains these strings, the account is permanently dead
// and should NOT be retried after token refresh.
export const ACCOUNT_DEACTIVATED_SIGNALS = [
  "account_deactivated",
  "account has been deactivated",
  "account has been disabled",
  "your account has been suspended",
  "this account is deactivated",
  // AG (Antigravity/Google Cloud Code) permanent ban signals
  "verify your account to continue",
  "this service has been disabled in this account for violation",
  "this service has been disabled in this account",
];

// T10 (sub2api PR #1169): Signals that indicate billing credits are exhausted.
// Distinct from rate-limit 429 — the account won't recover until credits are added.
export const CREDITS_EXHAUSTED_SIGNALS = [
  "insufficient_quota",
  "billing_hard_limit_reached",
  "exceeded your current quota",
  "exceeded your current usage quota",
  "credit_balance_too_low",
  "your credit balance is too low",
  "credits exhausted",
  "out of credits",
  "payment required",
  "free tier of the model has been exhausted",
  // #5239: providers (e.g. DeepSeek/GLM-style) return "Insufficient account balance"
  // on a depleted key. 402 is already terminalized by status, but catch non-402
  // out-of-credit bodies here too.
  "insufficient balance",
  "insufficient_balance",
  "insufficient account balance",
];

// T11: Signals that indicate OAuth token is invalid/expired (not permanent deactivation)
export const OAUTH_INVALID_TOKEN_SIGNALS = [
  "invalid authentication credentials",
  "oauth 2",
  "login cookie",
  "valid authentication credential",
  "invalid credentials",
];

// Context overflow patterns — the prompt exceeds the model's maximum context length.
// Different providers phrase this differently. Used to decide whether a 400 error
// should trigger combo fallback (a different model may have a larger context window).
// Exported so combo.ts's isContextOverflow400() guard (open-sse/services/combo.ts)
// can reuse this single source of truth instead of maintaining its own,
// independently-drifting pattern list (see issue #6637).
export const CONTEXT_OVERFLOW_PATTERNS = [
  /\binput is too long\b/i,
  /\binput too long\b/i,
  /\bcontext.*(too long|exceeded|overflow|limit)/i,
  /\btoo many tokens\b/i,
  /\bprompt is too long\b/i,
  /\bcontext window/i,
  /\bmaximum context/i,
  /\bmax.*token/i,
  /\btoken limit/i,
  /\brequest too large\b/i,
];

// Structured error codes that reliably indicate model access denied
// (more reliable than regex on human-readable messages).
// OpenAI:  { error: { code: "model_not_found", ... } }
// Anthropic: { error: { type: "not_found_error", ... } }
export const MODEL_ACCESS_DENIED_CODES = new Set([
  "model_not_found", // OpenAI, OpenAI-compatible (Kiro, Together, Fireworks, etc.)
  "deployment_not_found", // Azure OpenAI
]);

export const MODEL_ACCESS_DENIED_TYPES = new Set([
  "not_found_error", // Anthropic: model doesn't exist — reliably model-scoped
]);

// Anthropic's permission_error is NOT exclusively model-access related: it also
// covers API-key scope, organization restrictions and feature gating. Treating it
// as model-access-denied unconditionally would make a genuinely auth-restricted key
// silently exhaust every combo target and hide the real error from the caller.
// So it only counts when the message text confirms it refers to the model.
export const MODEL_ACCESS_AMBIGUOUS_TYPES = new Set([
  "permission_error", // Anthropic: could be model access OR key/org/feature scope
]);

// Model access patterns — the account does not have access to the requested model
// but a different account (e.g. PRO vs free tier) may support it.
// Exported so combo.ts #2101 can exempt model-scoped 400s from the body-specific
// stop guard (#5249): "model not supported" must advance to the next combo target
// even when the message also contains wrapper words like "invalid" / "bad request".
export const MODEL_ACCESS_DENIED_PATTERNS = [
  /\binvalid model\b/i,
  /\bmodel.*not.*(?:available|found|supported|accessible)\b/i,
  /\bmodel.*(?:does not exist|doesn't exist)\b/i,
  // "does not support" / "unsupported model" — GitHub Copilot / OpenAI-compatible
  // often phrase model rejection this way without the "is not supported" word order.
  /\bmodel\b[\s\S]{0,80}?\b(?:does\s+not\s+support|doesn't\s+support|unsupported)\b/i,
  /\b(?:does\s+not\s+support|doesn't\s+support|unsupported)\b[\s\S]{0,80}?\bmodel\b/i,
  /\bunsupported\s+model\b/i,
  /\baccess.*denied.*model\b/i,
  /\bmodel.*access.*denied\b/i,
  /\bplease select a different model\b/i,
  // "...access to the requested model" / "model ... access" — bounded lookahead
  // (no nested quantifiers) so it stays ReDoS-safe while requiring BOTH an
  // access/permission word and "model" so a pure auth error never matches.
  /\b(?:access|permission)[\s\S]{0,60}?\bmodel\b/i,
  /\bmodel[\s\S]{0,60}?\b(?:access|permission)\b/i,
];

// Pure credential/authentication failures — the key or token itself is bad, which
// is NOT a model-availability problem. Some providers phrase these as a 400 that
// also mentions the model (e.g. "invalid api key for model X"), which would
// otherwise trip MODEL_ACCESS_DENIED_PATTERNS above and trigger combo fallback
// across every target, masking the real "fix your credential" error. When the
// text clearly indicates a bad credential, the regex-based model-access detection
// is suppressed (structured codes/types like model_not_found are unaffected).
export const AUTH_CREDENTIAL_ERROR_PATTERNS = [
  /\b(?:invalid|incorrect|expired|missing|revoked)\s+api[\s_-]?key\b/i,
  /\bapi[\s_-]?key\s+(?:is\s+)?(?:invalid|incorrect|expired|missing|revoked|not\s+valid)\b/i,
  /\bauthentication\s+(?:failed|error|required)\b/i,
  /\b(?:invalid|expired|missing|revoked)\s+(?:token|credentials?|bearer)\b/i,
  /\bunauthorized\b/i,
  /\bnot\s+authenticated\b/i,
];

// Malformed request patterns — the model rejected the message format but a different
// provider/model in the combo may accept it.
export const MALFORMED_REQUEST_PATTERNS = [
  /\bimproperly formed request\b/i,
  /\binvalid.*message.*format/i,
  /\bmessages must alternate\b/i,
  /\bempty (message|content)\b/i,
  // Tool call function name errors
  /\bfunction'?s? name (?:can't|can not|is|has) (?:blank|empty|missing)/i,
  /function.*name.*(?:blank|empty|missing)/i,
  /tool_call.*name.*(?:blank|empty|missing)/i,
];

// Rate-limit text on a 400 — some providers (e.g. MiMoCode) signal throttling with a
// non-standard 400 status whose body carries rate-limit semantics instead of a 429
// (#4976). When detected, the request is fallback-worthy at connection-cooldown scope
// (NOT a whole-provider breaker) so combo routing can fail over to another free target.
// Exported: mimocode.ts's executor reuses this list directly (single source of truth).
export const RATE_LIMIT_TEXT_PATTERNS = [
  /high.?frequency/i,
  /non-compliant/i,
  /too many requests/i,
  /rate.?limit/i,
  /频繁/, // "frequent" (zh) — high-frequency request throttling
  /频率/, // "frequency" (zh) — request-frequency throttling
];

// Parameter validation errors — model-specific constraints (different models = different limits)
export const PARAM_VALIDATION_PATTERNS = [
  /max_tokens.*illegal/i,
  /max_tokens.*must be/i,
  /max_tokens.*range/i,
  /parameter is illegal/i,
  /is illegal.*range/i,
];

import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { formatErrorMessage } from "./errors.js";
import { type RetryConfig, type RetryOptions, resolveRetryConfig, retryAsync } from "./retry.js";

/** Runs an async operation with a policy-specific retry wrapper and optional log label. */
export type RetryRunner = <T>(fn: () => Promise<T>, label?: string) => Promise<T>;

/** Default retry envelope for channel API operations that hit transient network edges. */
export const CHANNEL_API_RETRY_DEFAULTS = {
  attempts: 3,
  minDelayMs: 400,
  maxDelayMs: 30_000,
  jitter: 0.1,
};

const CHANNEL_API_RETRY_RE =
  /429|421|timeout|connect|reset|closed|unavailable|temporarily|misdirected request/i;
const log = createSubsystemLogger("retry-policy");

function resolveChannelApiShouldRetry(params: {
  shouldRetry?: RetryOptions["shouldRetry"];
  strictShouldRetry?: boolean;
}): NonNullable<RetryOptions["shouldRetry"]> {
  if (!params.shouldRetry) {
    return (err: unknown) => CHANNEL_API_RETRY_RE.test(formatErrorMessage(err));
  }
  if (params.strictShouldRetry) {
    return params.shouldRetry;
  }
  // Channel APIs often wrap network failures differently by provider. Keep the
  // fallback regex unless callers opt into strict idempotency control.
  return (err: unknown, attempt: number) =>
    params.shouldRetry?.(err, attempt) || CHANNEL_API_RETRY_RE.test(formatErrorMessage(err));
}

function getChannelApiRetryAfterMs(err: unknown): number | undefined {
  const record = asOptionalRecord(err);
  if (!record) {
    return undefined;
  }
  // Check each supported wrapper until it supplies a valid rate-limit delay.
  for (const candidate of [
    record,
    asOptionalRecord(record.response),
    asOptionalRecord(record.error),
  ]) {
    const retryAfter = asOptionalRecord(candidate?.parameters)?.retry_after;
    if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
      return retryAfter * 1000;
    }
  }
  return undefined;
}

/** Creates the channel API retry runner used by outbound messaging integrations. */
export function createChannelApiRetryRunner(params: {
  retry?: RetryConfig;
  configRetry?: RetryConfig;
  verbose?: boolean;
  retryAfterMaxDelayMs?: number;
  shouldRetry?: RetryOptions["shouldRetry"];
  retryAfterMs?: RetryOptions["retryAfterMs"];
  /**
   * When true, the custom shouldRetry predicate is used exclusively —
   * the default channel API fallback regex is NOT OR'd in.
   * Use this for non-idempotent operations (e.g. sendMessage) where
   * the regex fallback would cause duplicate message delivery.
   */
  strictShouldRetry?: boolean;
}): RetryRunner {
  const retryConfig = resolveRetryConfig(CHANNEL_API_RETRY_DEFAULTS, {
    ...params.configRetry,
    ...params.retry,
  });
  const shouldRetry = resolveChannelApiShouldRetry(params);

  return <T>(fn: () => Promise<T>, label?: string) =>
    retryAsync(fn, {
      ...retryConfig,
      label,
      shouldRetry,
      retryAfterMs: params.retryAfterMs ?? getChannelApiRetryAfterMs,
      ...(params.retryAfterMaxDelayMs !== undefined
        ? { retryAfterMaxDelayMs: params.retryAfterMaxDelayMs }
        : {}),
      onRetry: params.verbose
        ? (info) => {
            const maxRetries = Math.max(1, info.maxAttempts - 1);
            log.warn(
              `channel send retry ${info.attempt}/${maxRetries} for ${info.label ?? label ?? "request"} in ${info.delayMs}ms: ${formatErrorMessage(info.err)}`,
            );
          }
        : undefined,
    });
}

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../logging/subsystem.js", () => ({ createSubsystemLogger: () => ({ warn: vi.fn() }) }));
vi.mock("./errors.js", () => ({ formatErrorMessage: () => "429 Too Many Requests" }));

import { createChannelApiRetryRunner } from "./retry-policy.js";

describe("channel API retry-after fallback", () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    { parameters: {}, response: { parameters: { retry_after: 1 } } },
    { parameters: { retry_after: "invalid" }, response: { parameters: { retry_after: 1 } } },
    { response: { parameters: {} }, error: { parameters: { retry_after: 1 } } },
    { parameters: { retry_after: 1 }, response: { parameters: { retry_after: 2 } } },
  ])("honors the first valid retry-after hint in %j", async (error) => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");
    const result = createChannelApiRetryRunner({
      retry: { attempts: 2, minDelayMs: 0, maxDelayMs: 5000, jitter: 0 },
    })(operation);
    await vi.advanceTimersByTimeAsync(999);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

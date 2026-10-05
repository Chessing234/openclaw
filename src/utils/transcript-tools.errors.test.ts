import { describe, expect, it } from "vitest";
import { parseUsageCostTranscriptRecord } from "../infra/session-cost-usage-pricing.js";

describe("usage transcript tool errors", () => {
  it.each([
    { type: "tool_result_error" },
    { type: "tool_result", isError: true },
    { type: "tool_result", is_error: true },
    { type: "toolResult", isError: true },
    { type: "function_call_output", is_error: true },
  ])("records the error for $type", (block) => {
    const parsed = parseUsageCostTranscriptRecord({
      message: { role: "user", content: [block, { type: "tool_result", is_error: false }] },
    });
    expect(parsed?.toolResultCounts).toEqual({ total: 2, errors: 1 });
  });
});

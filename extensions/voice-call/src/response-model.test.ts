// Voice Call tests cover response model plugin behavior.
import { describe, expect, it } from "vitest";
import type { OpenClawPluginApi } from "../api.js";
import { normalizeVoiceCallConfig } from "./config.js";
import { resolveVoiceResponseModel } from "./response-model.js";

const agentRuntime = {
  defaults: {
    provider: "together",
    model: "Qwen/Qwen2.5-7B-Instruct-Turbo",
  },
} as unknown as OpenClawPluginApi["runtime"]["agent"];

describe("resolveVoiceResponseModel", () => {
  it("keeps legacy single-segment overrides on the runtime default provider", () => {
    expect(
      resolveVoiceResponseModel({
        voiceConfig: normalizeVoiceCallConfig({
          responseModel: "gpt-5.4-mini",
        }),
        agentRuntime,
      }),
    ).toEqual({
      provider: "together",
      model: "gpt-5.4-mini",
    });
  });

  it("uses the call agent's configured model when responseModel is unset", () => {
    expect(
      resolveVoiceResponseModel({
        voiceConfig: normalizeVoiceCallConfig({}),
        agentRuntime,
        configuredModel: { provider: "anthropic", model: "claude-opus-5-5" },
      }),
    ).toEqual({
      provider: "anthropic",
      model: "claude-opus-5-5",
    });
  });

  it("keeps a single-segment override on the configured provider", () => {
    expect(
      resolveVoiceResponseModel({
        voiceConfig: normalizeVoiceCallConfig({ responseModel: "opus" }),
        agentRuntime,
        configuredModel: { provider: "anthropic", model: "claude-opus-5-5" },
      }),
    ).toEqual({
      provider: "anthropic",
      model: "opus",
    });
  });
});
